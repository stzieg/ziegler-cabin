import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../utils/supabase';
import type { Photo, PhotoMetadata } from '../../types';
import styles from './GalleryTab.module.css';

/**
 * Lazy loading photo component - only loads image when in viewport
 */
const LazyPhoto: React.FC<{
  photo: Photo;
  onClick: () => void;
}> = ({ photo, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={imgRef}
      className={styles.photoItem}
      data-testid="photo-item"
      onClick={onClick}
    >
      {isInView ? (
        <img
          src={photo.url}
          alt={photo.caption || photo.filename}
          className={`${styles.photoImage} ${isLoaded ? styles.loaded : styles.loading}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
        />
      ) : (
        <div className={styles.photoPlaceholder} />
      )}
    </div>
  );
};

interface GalleryTabProps {
  user: User;
  formState?: Record<string, any>;
  isAdmin?: boolean;
}

/**
 * Gallery Tab Component - Photo gallery with upload and organization
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.3
 */
export const GalleryTab: React.FC<GalleryTabProps> = ({ user, formState, isAdmin }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [filterAlbum, setFilterAlbum] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const [visibleCount, setVisibleCount] = useState(12); // Start with 12 photos
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  /**
   * Load photos from Supabase
   * Requirements: 4.1 - Display photos organized by date or event
   */
  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all photos (shared family gallery) - not just user's photos
      const { data, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .order('upload_date', { ascending: false });

      if (fetchError) {
        console.error('Database fetch error:', fetchError);
        
        if (fetchError.message.includes('relation "photos" does not exist')) {
          throw new Error('Photo database is not set up. Please contact support to run database migrations.');
        } else if (fetchError.message.includes('permission denied')) {
          throw new Error('You do not have permission to view photos. Please contact support.');
        } else {
          throw new Error(`Database error: ${fetchError.message}`);
        }
      }

      setPhotos(data || []);
    } catch (err) {
      console.error('Error loading photos:', err);
      
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while loading photos. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle photo upload with image compression (supports bulk upload)
   * Requirements: 4.2 - Photo upload with metadata capture
   */
  const handlePhotoUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (selectedFiles.length === 0) {
      setError('Please select at least one file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress({ current: 0, total: selectedFiles.length });

      const errors: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length });

        try {
          // Compress image before upload for better performance
          const compressedFile = await compressImage(file);
          const fileToUpload = compressedFile || file;

          // Create unique filename
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;

          // Upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(fileName, fileToUpload, {
              cacheControl: '31536000',
              upsert: false
            });

          if (uploadError) {
            errors.push(`${file.name}: ${uploadError.message}`);
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('photos')
            .getPublicUrl(fileName);

          if (!publicUrl) {
            errors.push(`${file.name}: Failed to generate URL`);
            continue;
          }

          // Extract basic metadata
          const metadata: PhotoMetadata = {
            size: fileToUpload.size,
            format: file.type.split('/')[1] || 'unknown'
          };

          // Save photo record to database
          const { error: dbError } = await supabase
            .from('photos')
            .insert({
              user_id: user.id,
              filename: file.name,
              url: publicUrl,
              caption: null,
              tags: [],
              album_id: null,
              metadata
            });

          if (dbError) {
            // Try to clean up the uploaded file
            await supabase.storage.from('photos').remove([fileName]);
            errors.push(`${file.name}: ${dbError.message}`);
          }
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Reset form
      setSelectedFiles([]);
      setShowUploadForm(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await loadPhotos();

      if (errors.length > 0) {
        setError(`Some uploads failed:\n${errors.join('\n')}`);
      }
      
    } catch (err) {
      console.error('Error uploading photos:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  /**
   * Compress image before upload to reduce file size and upload time
   */
  const compressImage = (file: File): Promise<File | null> => {
    return new Promise((resolve) => {
      // Skip compression for small files or non-images
      if (file.size < 500 * 1024 || !file.type.startsWith('image/')) {
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Calculate new dimensions (max 2000px on longest side)
        const maxSize = 2000;
        let { width, height } = img;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(null);
            }
          },
          'image/jpeg',
          0.85 // 85% quality
        );
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  };

  /**
   * Show delete confirmation modal
   */
  const confirmDeletePhoto = (photo: Photo) => {
    if (!isAdmin) return;
    setPhotoToDelete(photo);
    setShowDeleteConfirm(true);
  };

  /**
   * Handle photo deletion (admin only)
   */
  const handleDeletePhoto = async () => {
    if (!isAdmin || !photoToDelete) return;

    try {
      setDeleting(true);
      setError(null);

      // Extract the file path from the URL
      const urlParts = photoToDelete.url.split('/photos/');
      const filePath = urlParts[urlParts.length - 1];

      // Delete from storage
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('photos')
          .remove([filePath]);

        if (storageError) {
          console.warn('Could not delete file from storage:', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoToDelete.id);

      if (dbError) {
        throw new Error(`Failed to delete photo: ${dbError.message}`);
      }

      // Close modals and reload photos
      setShowDeleteConfirm(false);
      setPhotoToDelete(null);
      setSelectedPhoto(null);
      await loadPhotos();

    } catch (err) {
      console.error('Error deleting photo:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while deleting the photo.');
      }
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Handle file selection (supports multiple files)
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: Not an image file`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError(null);
    }

    setSelectedFiles(validFiles);
  };

  /**
   * Filter and sort photos
   * Requirements: 4.4 - Automatic organization by date and manual categorization
   */
  const getFilteredAndSortedPhotos = useCallback(() => {
    let filtered = [...photos];

    // Filter by album if selected
    if (filterAlbum) {
      filtered = filtered.filter(photo => photo.album_id === filterAlbum);
    }

    // Sort photos by date (use date taken if available, otherwise fall back to upload date)
    filtered.sort((a, b) => {
      const dateA = a.metadata.dateTaken ? new Date(a.metadata.dateTaken) : new Date(a.upload_date);
      const dateB = b.metadata.dateTaken ? new Date(b.metadata.dateTaken) : new Date(b.upload_date);
      return dateB.getTime() - dateA.getTime();
    });

    return filtered;
  }, [photos, filterAlbum]);

  /**
   * Get unique albums for filtering
   */
  const getAlbums = useCallback(() => {
    const albums = new Set<string>();
    photos.forEach(photo => {
      if (photo.album_id) {
        albums.add(photo.album_id);
      }
    });
    return Array.from(albums);
  }, [photos]);

  // Load photos on component mount
  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Restore form state if provided
  useEffect(() => {
    if (formState) {
      if (formState.showUploadForm) setShowUploadForm(formState.showUploadForm);
    }
  }, [formState]);

  const filteredPhotos = getFilteredAndSortedPhotos();
  const albums = getAlbums();
  const visiblePhotos = filteredPhotos.slice(0, visibleCount);
  const hasMorePhotos = visibleCount < filteredPhotos.length;

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(12);
  }, [filterAlbum]);

  // Infinite scroll - load more when reaching bottom
  useEffect(() => {
    if (!loadMoreRef.current || !hasMorePhotos) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + 12, filteredPhotos.length));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMorePhotos, filteredPhotos.length]);

  /**
   * Navigate to previous/next photo in full-screen viewer
   */
  const navigatePhoto = useCallback((direction: 'prev' | 'next') => {
    if (!selectedPhoto) return;
    
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex === -1) return;
    
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredPhotos.length - 1;
    } else {
      newIndex = currentIndex < filteredPhotos.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedPhoto(filteredPhotos[newIndex]);
  }, [selectedPhoto, filteredPhotos]);

  /**
   * Handle keyboard navigation in full-screen viewer
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPhoto) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePhoto('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigatePhoto('next');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedPhoto(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, navigatePhoto]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Photo Gallery</h2>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.uploadButton}
            onClick={() => setShowUploadForm(true)}
            data-testid="upload-button"
          >
            Upload Photos
          </button>

          {albums.length > 0 && (
            <select
              value={filterAlbum}
              onChange={(e) => setFilterAlbum(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All Albums</option>
              {albums.map(album => (
                <option key={album} value={album}>{album}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          {error.includes('storage') && (
            <div className={styles.errorHelp}>
              <p><strong>Storage Setup Required:</strong></p>
              <ul>
                <li>Follow the migration guide in <code>RUN_MIGRATIONS.md</code></li>
                <li>Run all 5 database migrations in order</li>
                <li>Ensure the 'photos' storage bucket exists in your Supabase project</li>
                <li>Check that storage policies are properly configured</li>
              </ul>
            </div>
          )}
          {error.includes('database') && (
            <div className={styles.errorHelp}>
              <p><strong>Database Setup Required:</strong></p>
              <ul>
                <li>Follow the migration guide in <code>RUN_MIGRATIONS.md</code></li>
                <li>Run all 5 database migrations in order</li>
                <li>Ensure the 'photos' table exists</li>
                <li>Check that RLS policies are properly configured</li>
              </ul>
            </div>
          )}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <form onSubmit={handlePhotoUpload} data-testid="upload-form">
              <h3>Upload Photos</h3>
              
              <div className={styles.formGroup}>
                <label htmlFor="file">Select Photos (multiple allowed):</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  required
                />
                {selectedFiles.length > 0 && (
                  <div className={styles.fileList}>
                    <p className={styles.fileCount}>{selectedFiles.length} file(s) selected</p>
                    <ul className={styles.fileNames}>
                      {selectedFiles.slice(0, 5).map((file, i) => (
                        <li key={i}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                      ))}
                      {selectedFiles.length > 5 && (
                        <li>...and {selectedFiles.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {uploadProgress && (
                <div className={styles.uploadProgress}>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                  <p>Uploading {uploadProgress.current} of {uploadProgress.total}...</p>
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false);
                    setSelectedFiles([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedFiles.length === 0 || uploading}
                >
                  {uploading ? 'Uploading...' : `Upload ${selectedFiles.length || ''} Photo${selectedFiles.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <div 
        className={styles.photoGrid}
        data-testid="photo-grid"
      >
        {filteredPhotos.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No photos uploaded yet.</p>
            <button
              type="button"
              onClick={() => setShowUploadForm(true)}
              className={styles.uploadButton}
            >
              Upload Your First Photo
            </button>
          </div>
        ) : (
          <>
            {visiblePhotos.map((photo) => (
              <LazyPhoto
                key={photo.id}
                photo={photo}
                onClick={() => setSelectedPhoto(photo)}
              />
            ))}
            {/* Load more trigger */}
            {hasMorePhotos && (
              <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
                <div className={styles.spinner} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Full-Screen Photo Viewer */}
      {selectedPhoto && (
        <div 
          className={styles.fullScreenPhotoViewer} 
          onClick={() => setSelectedPhoto(null)}
          data-testid="full-screen-photo-viewer"
        >
          <div className={styles.fullScreenBackground} />
          {/* Close button outside content for better mobile touch */}
          <button
            className={styles.fullScreenCloseButton}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedPhoto(null);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedPhoto(null);
            }}
            aria-label="Close full-screen photo viewer"
            type="button"
          >
            ✕
          </button>
          <div className={styles.fullScreenContent} onClick={(e) => e.stopPropagation()}>
            
            {/* Navigation Arrows */}
            {filteredPhotos.length > 1 && (
              <>
                <button
                  className={`${styles.navButton} ${styles.navPrev}`}
                  onClick={() => navigatePhoto('prev')}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  className={`${styles.navButton} ${styles.navNext}`}
                  onClick={() => navigatePhoto('next')}
                  aria-label="Next photo"
                >
                  ›
                </button>
              </>
            )}
            
            <div className={styles.fullScreenImageContainer}>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || selectedPhoto.filename}
                className={styles.fullScreenImage}
                data-testid="full-screen-image"
              />
            </div>
            <div className={styles.fullScreenPhotoDetails}>
              <div className={styles.photoDetailsContent}>
                {selectedPhoto.caption && <p className={styles.photoCaption}>{selectedPhoto.caption}</p>}
                <div className={styles.photoMetadata}>
                  {selectedPhoto.metadata.dateTaken && (
                    <p>Taken: {new Date(selectedPhoto.metadata.dateTaken).toLocaleString()}</p>
                  )}
                  <p>Uploaded: {new Date(selectedPhoto.upload_date).toLocaleString()}</p>
                  {selectedPhoto.metadata.dimensions && (
                    <p>
                      Dimensions: {selectedPhoto.metadata.dimensions.width} × {selectedPhoto.metadata.dimensions.height}
                    </p>
                  )}
                  {selectedPhoto.metadata.size && (
                    <p>Size: {(selectedPhoto.metadata.size / 1024 / 1024).toFixed(2)} MB</p>
                  )}
                </div>
                {selectedPhoto.tags.length > 0 && (
                  <div className={styles.fullScreenPhotoTags}>
                    {selectedPhoto.tags.map(tag => (
                      <span key={tag} className={styles.fullScreenTag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              {isAdmin && (
                <button
                  className={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDeletePhoto(selectedPhoto);
                  }}
                  disabled={deleting}
                  aria-label="Delete photo"
                  title="Delete photo"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && photoToDelete && (
        <div className={styles.confirmModal} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()}>
            <h3>Delete Photo?</h3>
            <p>Are you sure you want to delete this photo? This action cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPhotoToDelete(null);
                }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmDeleteButton}
                onClick={handleDeletePhoto}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};