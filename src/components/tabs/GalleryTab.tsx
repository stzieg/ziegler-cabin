import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../utils/supabase';
import type { Photo, PhotoMetadata } from '../../types';
import styles from './GalleryTab.module.css';

interface GalleryTabProps {
  user: User;
  formState?: Record<string, any>;
  isAdmin?: boolean;
}

interface PhotoUploadData {
  caption: string;
  tags: string;
  album_id?: string;
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
  const [uploadData, setUploadData] = useState<PhotoUploadData>({
    caption: '',
    tags: '',
    album_id: undefined
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterAlbum, setFilterAlbum] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
   * Handle photo upload
   * Requirements: 4.2 - Photo upload with metadata capture
   */
  const handlePhotoUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Create unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Skip bucket check since diagnostics confirmed it works
      // The listBuckets() API has issues but direct bucket access works fine

      // Upload file to Supabase Storage
      const { data: uploadResult, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        
        // Provide more specific error messages
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Photo storage bucket not found. Please contact support to set up photo storage.');
        } else if (uploadError.message.includes('File size')) {
          throw new Error('File is too large. Please select a file smaller than 10MB.');
        } else if (uploadError.message.includes('File type')) {
          throw new Error('Invalid file type. Please select a valid image file (JPEG, PNG, GIF, or WebP).');
        } else {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      if (!publicUrl) {
        throw new Error('Failed to generate public URL for uploaded photo.');
      }

      // Extract metadata
      const metadata: PhotoMetadata = {
        size: selectedFile.size,
        format: selectedFile.type.split('/')[1] || 'unknown'
      };

      // If it's an image, try to get dimensions and EXIF data
      if (selectedFile.type.startsWith('image/')) {
        try {
          const dimensions = await getImageDimensions(selectedFile);
          if (dimensions) {
            metadata.dimensions = dimensions;
          }
        } catch (dimensionError) {
          console.warn('Could not extract image dimensions:', dimensionError);
          // Continue without dimensions - not critical
        }

        // Extract EXIF date taken
        try {
          const exifDate = await getExifDateTaken(selectedFile);
          if (exifDate) {
            metadata.dateTaken = exifDate;
          }
        } catch (exifError) {
          console.warn('Could not extract EXIF date:', exifError);
          // Continue without EXIF date - not critical
        }
      }

      // Parse tags from form data
      const tags = uploadData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Save photo record to database
      const { error: dbError } = await supabase
        .from('photos')
        .insert({
          user_id: user.id,
          filename: selectedFile.name,
          url: publicUrl,
          caption: uploadData.caption || null,
          tags,
          album_id: uploadData.album_id || null,
          metadata
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        
        // Try to clean up the uploaded file if database insert fails
        try {
          await supabase.storage.from('photos').remove([fileName]);
        } catch (cleanupError) {
          console.warn('Could not clean up uploaded file after database error:', cleanupError);
        }
        
        if (dbError.message.includes('photos_pkey')) {
          throw new Error('A photo with this name already exists. Please rename your file and try again.');
        } else if (dbError.message.includes('foreign key')) {
          throw new Error('User authentication error. Please log out and log back in.');
        } else {
          throw new Error(`Database error: ${dbError.message}`);
        }
      }

      // Reset form and reload photos
      setUploadData({ caption: '', tags: '', album_id: undefined });
      setSelectedFile(null);
      setShowUploadForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await loadPhotos();
      
      // Show success message briefly
      setError(null);
      
    } catch (err) {
      console.error('Error uploading photo:', err);
      
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while uploading the photo. Please try again.');
      }
    } finally {
      setUploading(false);
    }
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
   * Get image dimensions from file
   */
  const getImageDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  };

  /**
   * Extract EXIF date taken from image file
   */
  const getExifDateTaken = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const dataView = new DataView(arrayBuffer);
          
          // Check for JPEG EXIF data
          if (dataView.getUint16(0) !== 0xFFD8) {
            resolve(null); // Not a JPEG
            return;
          }
          
          let offset = 2;
          let marker;
          
          // Find EXIF marker (0xFFE1)
          while (offset < dataView.byteLength) {
            marker = dataView.getUint16(offset);
            if (marker === 0xFFE1) {
              // Found EXIF marker
              const exifLength = dataView.getUint16(offset + 2);
              const exifData = new DataView(arrayBuffer, offset + 4, exifLength - 2);
              
              // Look for "Exif" identifier
              if (exifData.getUint32(0) === 0x45786966) { // "Exif"
                const dateTime = extractDateTimeFromExif(exifData);
                resolve(dateTime);
                return;
              }
            }
            
            if (marker === 0xFFDA) break; // Start of scan data
            offset += 2 + dataView.getUint16(offset + 2);
          }
          
          resolve(null); // No EXIF date found
        } catch (error) {
          console.warn('Error parsing EXIF data:', error);
          resolve(null);
        }
      };
      
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file.slice(0, 65536)); // Read first 64KB for EXIF
    });
  };

  /**
   * Extract DateTime from EXIF data
   */
  const extractDateTimeFromExif = (exifData: DataView): string | null => {
    try {
      // Skip to TIFF header (after "Exif\0\0")
      let offset = 6;
      
      // Check byte order
      const byteOrder = exifData.getUint16(offset);
      const littleEndian = byteOrder === 0x4949;
      
      // Get first IFD offset
      offset += 2; // Skip byte order marker
      offset += 2; // Skip TIFF magic number
      let ifdOffset = littleEndian ? exifData.getUint32(offset, true) : exifData.getUint32(offset, false);
      
      // Read IFD entries
      offset = 6 + ifdOffset;
      const numEntries = littleEndian ? exifData.getUint16(offset, true) : exifData.getUint16(offset, false);
      offset += 2;
      
      // Look for DateTime tag (0x0132) or DateTimeOriginal (0x9003)
      for (let i = 0; i < numEntries; i++) {
        const entryOffset = offset + (i * 12);
        const tag = littleEndian ? exifData.getUint16(entryOffset, true) : exifData.getUint16(entryOffset, false);
        
        if (tag === 0x9003 || tag === 0x0132) { // DateTimeOriginal or DateTime
          const type = littleEndian ? exifData.getUint16(entryOffset + 2, true) : exifData.getUint16(entryOffset + 2, false);
          const count = littleEndian ? exifData.getUint32(entryOffset + 4, true) : exifData.getUint32(entryOffset + 4, false);
          
          if (type === 2 && count === 20) { // ASCII string, 20 chars
            const valueOffset = littleEndian ? exifData.getUint32(entryOffset + 8, true) : exifData.getUint32(entryOffset + 8, false);
            
            // Read the date string
            let dateString = '';
            const stringOffset = 6 + valueOffset;
            for (let j = 0; j < 19; j++) { // 19 chars (excluding null terminator)
              dateString += String.fromCharCode(exifData.getUint8(stringOffset + j));
            }
            
            // Convert EXIF date format "YYYY:MM:DD HH:MM:SS" to ISO format
            if (dateString.match(/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/)) {
              const isoDate = dateString.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3') + 'Z';
              return isoDate;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Error extracting DateTime from EXIF:', error);
      return null;
    }
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
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
      if (formState.caption) setUploadData(prev => ({ ...prev, caption: formState.caption }));
      if (formState.tags) setUploadData(prev => ({ ...prev, tags: formState.tags }));
      if (formState.album_id) setUploadData(prev => ({ ...prev, album_id: formState.album_id }));
      if (formState.showUploadForm) setShowUploadForm(formState.showUploadForm);
    }
  }, [formState]);

  const filteredPhotos = getFilteredAndSortedPhotos();
  const albums = getAlbums();

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
          
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'grid' | 'list')}
            className={styles.viewSelect}
          >
            <option value="grid">Grid View</option>
            <option value="list">List View</option>
          </select>

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
              <h3>Upload Photo</h3>
              
              <div className={styles.formGroup}>
                <label htmlFor="file">Select Photo:</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  required
                />
                {selectedFile && (
                  <p className={styles.fileInfo}>
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false);
                    setSelectedFile(null);
                    setUploadData({ caption: '', tags: '', album_id: undefined });
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
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <div 
        className={`${styles.photoGrid} ${viewMode === 'list' ? styles.listView : ''}`}
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
          filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className={styles.photoItem}
              data-testid="photo-item"
              data-filename={photo.filename}
              {...(photo.album_id && { 'data-album-id': photo.album_id })}
              data-tags={photo.tags.join(',')}
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.url}
                alt={photo.caption || photo.filename}
                className={styles.photoImage}
                loading="lazy"
              />
              <div className={styles.photoOverlay}>
                <div className={styles.photoInfo}>
                  {photo.caption && (
                    <p className={styles.photoCaption}>{photo.caption}</p>
                  )}
                  <p className={styles.photoDate}>
                    {photo.metadata.dateTaken 
                      ? new Date(photo.metadata.dateTaken).toLocaleDateString()
                      : new Date(photo.upload_date).toLocaleDateString()
                    }
                  </p>
                  {photo.tags.length > 0 && (
                    <div className={styles.photoTags}>
                      {photo.tags.map(tag => (
                        <span key={tag} className={styles.tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
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
          <div className={styles.fullScreenContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.fullScreenCloseButton}
              onClick={() => setSelectedPhoto(null)}
              aria-label="Close full-screen photo viewer"
            >
              ✕
            </button>
            
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