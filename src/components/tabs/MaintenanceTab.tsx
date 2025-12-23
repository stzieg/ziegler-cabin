import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import type { MaintenanceTask, MaintenanceType } from '../../types';
import { supabase } from '../../utils/supabase';
import styles from './MaintenanceTab.module.css';

interface MaintenanceTabProps {
  user: User;
  formState?: Record<string, any>;
  isAdmin?: boolean;
}

interface MaintenanceFormData {
  title: string;
  description: string;
  task_type: MaintenanceType | '';
  cost: string;
  status: 'in_progress' | 'completed';
}

/**
 * Maintenance Tab Component - Full maintenance logging system
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({ user, formState, isAdmin = false }) => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<MaintenanceFormData>({
    title: '',
    description: '',
    task_type: '',
    cost: '',
    status: 'in_progress'
  });

  // Load maintenance tasks on component mount
  useEffect(() => {
    loadMaintenanceTasks();
  }, []);

  // Restore form state if provided
  useEffect(() => {
    if (formState) {
      setFormData(prev => ({
        ...prev,
        ...formState
      }));
    }
  }, [formState]);

  const loadMaintenanceTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: tasksData, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .order('completion_date', { ascending: false });

      if (error) throw error;

      // Get user profiles for the tasks (if needed for display)
      let enrichedTasks = tasksData || [];
      
      if (tasksData && tasksData.length > 0) {
        const userIds = [...new Set(tasksData.map(t => t.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          // Merge profile data with tasks
          enrichedTasks = tasksData.map(task => ({
            ...task,
            profiles: profilesData.find(profile => profile.id === task.user_id)
          }));
        }
      }

      setTasks(enrichedTasks);
    } catch (err) {
      console.error('Error loading maintenance tasks:', err);
      
      // If the table doesn't exist, show a helpful message
      if (err instanceof Error && err.message.includes('relation "maintenance_tasks" does not exist')) {
        setTasks([]);
        setError('Database not fully set up. Please run migrations to enable maintenance tracking.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load maintenance tasks');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);

      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.task_type) {
        throw new Error('Task type is required');
      }

      const taskData = {
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        task_type: formData.task_type as MaintenanceType,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        completion_date: new Date().toISOString().split('T')[0],
        status: formData.status
      };

      if (editingTask) {
        // Update existing task
        const { error } = await supabase
          .from('maintenance_tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
      } else {
        // Create new task
        const { error } = await supabase
          .from('maintenance_tasks')
          .insert([taskData]);

        if (error) throw error;
      }

      // Reset form and reload tasks
      resetForm();
      await loadMaintenanceTasks();
    } catch (err) {
      console.error('Error saving maintenance task:', err);
      setError(err instanceof Error ? err.message : 'Failed to save maintenance task');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      task_type: '',
      cost: '',
      status: 'in_progress'
    });
    setShowForm(false);
    setEditingTask(null);
  };

  const handleEdit = (task: MaintenanceTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      task_type: task.task_type,
      cost: task.cost?.toString() || '',
      status: (task as any).status || 'in_progress'
    });
    setShowForm(true);
  };

  const handleToggleStatus = async (task: MaintenanceTask) => {
    try {
      const newStatus = (task as any).status === 'completed' ? 'in_progress' : 'completed';
      const { error } = await supabase
        .from('maintenance_tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) throw error;
      await loadMaintenanceTasks();
    } catch (err) {
      console.error('Error updating task status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task status');
    }
  };

  const handleDelete = async (taskId: string) => {
    console.log('Delete clicked for task:', taskId);
    setTaskToDelete(taskId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;

    try {
      console.log('Attempting to delete task:', taskToDelete);
      const { error } = await supabase
        .from('maintenance_tasks')
        .delete()
        .eq('id', taskToDelete);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      
      console.log('Delete successful, reloading tasks');
      await loadMaintenanceTasks();
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    } catch (err) {
      console.error('Error deleting maintenance task:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete maintenance task');
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    }
  };

  const cancelDelete = () => {
    console.log('Delete cancelled by user');
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  };

  const validateTitle = (title: string) => {
    return title.trim().length > 0;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading maintenance tasks...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Maintenance Log</h2>
        <button 
          className={styles.addButton}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add Task'}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className={styles.formContainer}>
          <h3>{editingTask ? 'Edit Task' : 'Add New Maintenance Task'}</h3>
          <form onSubmit={handleSubmit} data-testid="maintenance-form">
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={(e) => {
                    const input = e.target;
                    setFormData(prev => ({ ...prev, title: input.value }));
                    // Custom validation for whitespace-only strings
                    if (!validateTitle(input.value)) {
                      input.setCustomValidity('Title cannot be empty or contain only whitespace');
                    } else {
                      input.setCustomValidity('');
                    }
                  }}
                  required
                  maxLength={255}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="task_type">Task Type *</label>
                <select
                  id="task_type"
                  name="task_type"
                  value={formData.task_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, task_type: e.target.value as MaintenanceType }))}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="repair">Repair</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="improvement">Improvement</option>
                  <option value="inspection">Inspection</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="cost">Cost Estimate ($)</label>
                <input
                  type="number"
                  id="cost"
                  name="cost"
                  value={formData.cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton}>
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
              <button type="button" onClick={resetForm} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks List */}
      <div className={styles.tasksList}>
        {tasks.length === 0 ? (
          <div className={styles.emptyState}>
            No maintenance tasks found. Add your first task above.
          </div>
        ) : (
          <>
            {/* In Progress Tasks */}
            {tasks.filter(t => (t as any).status !== 'completed').length > 0 && (
              <div className={styles.taskSection}>
                <h3 className={styles.sectionTitle}>In Progress</h3>
                <div className={styles.tasksGrid}>
                  {tasks.filter(t => (t as any).status !== 'completed').map((task) => (
                    <div key={task.id} className={styles.taskCard}>
                      <div className={styles.taskHeader}>
                        <h4>{task.title}</h4>
                        <span className={`${styles.taskType} ${styles[task.task_type]}`}>
                          {task.task_type}
                        </span>
                      </div>
                      <div className={styles.taskDetails}>
                        <p><strong>Date:</strong> {new Date(task.completion_date).toLocaleDateString()}</p>
                        {task.cost != null && <p><strong>Cost Estimate:</strong> ${task.cost.toFixed(2)}</p>}
                        {task.description && <p><strong>Description:</strong> {task.description}</p>}
                      </div>
                      <div className={styles.taskActions}>
                        <button 
                          onClick={() => handleToggleStatus(task)}
                          className={styles.completeButton}
                        >
                          Mark Complete
                        </button>
                        <button 
                          onClick={() => handleEdit(task)}
                          className={styles.editButton}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(task.id)}
                          className={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {tasks.filter(t => (t as any).status === 'completed').length > 0 && (
              <div className={styles.taskSection}>
                <h3 className={styles.sectionTitle}>Completed</h3>
                <div className={styles.tasksGrid}>
                  {tasks.filter(t => (t as any).status === 'completed').map((task) => (
                    <div key={task.id} className={`${styles.taskCard} ${styles.completedCard}`}>
                      <div className={styles.taskHeader}>
                        <h4>{task.title}</h4>
                        <span className={`${styles.taskType} ${styles[task.task_type]}`}>
                          {task.task_type}
                        </span>
                      </div>
                      <div className={styles.taskDetails}>
                        <p><strong>Date:</strong> {new Date(task.completion_date).toLocaleDateString()}</p>
                        {task.cost != null && <p><strong>Cost Estimate:</strong> ${task.cost.toFixed(2)}</p>}
                        {task.description && <p><strong>Description:</strong> {task.description}</p>}
                      </div>
                      <div className={styles.taskActions}>
                        <button 
                          onClick={() => handleToggleStatus(task)}
                          className={styles.reopenButton}
                        >
                          Reopen
                        </button>
                        <button 
                          onClick={() => handleEdit(task)}
                          className={styles.editButton}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(task.id)}
                          className={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.modalHeader}>
              <h3>Delete Maintenance Task</h3>
            </div>
            <div className={styles.modalContent}>
              <p>Are you sure you want to delete this maintenance task?</p>
              <p className={styles.warningText}>This action cannot be undone.</p>
            </div>
            <div className={styles.modalActions}>
              <button 
                onClick={cancelDelete}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className={styles.confirmDeleteButton}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};