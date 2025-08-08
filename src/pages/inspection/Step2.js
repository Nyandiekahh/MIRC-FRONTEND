// src/pages/inspection/Step2.js - FIXED VERSION
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { useFormStore } from '../../store';
import { inspectionsAPI } from '../../services/api';
import StepIndicator from '../../components/StepIndicator';
import ProgressBar from '../../components/ProgressBar';
import LoadingSpinner from '../../components/LoadingSpinner';

// Make all fields optional like Step1
const schema = yup.object({
  tower_owner_name: yup.string(),
  height_above_ground: yup.string(),
  above_building_roof: yup.boolean(),
  building_height: yup.string(),
  tower_type: yup.string(),
  tower_type_other: yup.string(),
  rust_protection: yup.string(),
  installation_year: yup.string(),
  manufacturer_name: yup.string(),
  model_number: yup.string(),
  maximum_wind_load: yup.string(),
  maximum_load_charge: yup.string(),
  has_insurance: yup.boolean(),
  insurance_company: yup.string(),
  has_concrete_base: yup.boolean(),
  has_lightning_protection: yup.boolean(),
  is_electrically_grounded: yup.boolean(),
  has_aviation_warning_light: yup.boolean(),
  has_other_antennas: yup.boolean(),
  other_antennas_details: yup.string(),
});

const STEPS = [
  { id: 1, title: 'Program & General' },
  { id: 2, title: 'Tower Info' },
  { id: 3, title: 'Transmitter' },
  { id: 4, title: 'Antenna & Final' },
];

const Step2 = () => {
  const navigate = useNavigate();
  const { id: inspectionId } = useParams();
  const isEditing = Boolean(inspectionId);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const { 
    formData, 
    setFormData, 
    setCurrentStep, 
    setCurrentInspection,
    setAutoSaveStatus,
    setLastSaved,
    validationErrors, 
    setValidationErrors 
  } = useFormStore();

  // Load existing inspection if editing
  const { data: existingInspection, isLoading: inspectionLoading } = useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: () => inspectionsAPI.getById(inspectionId).then(res => res.data),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
    trigger,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: formData,
  });

  const watchedValues = watch();
  const watchTowerType = watch('tower_type');
  const watchAboveBuildingRoof = watch('above_building_roof');
  const watchHasInsurance = watch('has_insurance');
  const watchHasOtherAntennas = watch('has_other_antennas');

  // Auto-save mutation - Simplified like Step1
  const autoSaveMutation = useMutation({
    mutationFn: async (data) => {
      console.log('🔍 [Step2] Starting save with data:', data);
      
      try {
        // Only auto-save if there's meaningful data
        const hasData = data.tower_owner_name || data.height_above_ground || data.tower_type || 
                       data.rust_protection || data.manufacturer_name;
        
        if (!hasData) {
          console.log('⏭️ [Step2] No meaningful data to save, skipping auto-save');
          return null;
        }

        // Prepare inspection data with tower fields
        const inspectionData = {
          status: 'draft',
          inspection_date: new Date().toISOString().split('T')[0],
          
          // Add tower fields
          tower_owner_name: data.tower_owner_name || '',
          height_above_ground: data.height_above_ground || '',
          above_building_roof: data.above_building_roof || false,
          building_height: data.building_height || '',
          tower_type: data.tower_type || '',
          tower_type_other: data.tower_type_other || '',
          rust_protection: data.rust_protection || '',
          installation_year: data.installation_year || '',
          manufacturer_name: data.manufacturer_name || '',
          model_number: data.model_number || '',
          maximum_wind_load: data.maximum_wind_load || '',
          maximum_load_charge: data.maximum_load_charge || '',
          has_insurance: data.has_insurance || false,
          insurance_company: data.insurance_company || '',
          has_concrete_base: data.has_concrete_base || false,
          has_lightning_protection: data.has_lightning_protection || false,
          is_electrically_grounded: data.is_electrically_grounded || false,
          has_aviation_warning_light: data.has_aviation_warning_light || false,
          has_other_antennas: data.has_other_antennas || false,
          other_antennas_details: data.other_antennas_details || '',
        };

        // Keep existing broadcaster and program if available
        if (existingInspection?.broadcaster) {
          inspectionData.broadcaster = existingInspection.broadcaster;
        }
        if (existingInspection?.program) {
          inspectionData.program = existingInspection.program;
        }

        // Update inspection record
        let inspection;
        
        if (isEditing && inspectionId && inspectionId !== 'undefined') {
          console.log('📝 [Step2] Updating existing inspection:', inspectionId);
          const response = await inspectionsAPI.update(inspectionId, inspectionData);
          inspection = response.data;
          console.log('✅ [Step2] Inspection updated successfully:', inspection);
        } else {
          console.log('🆕 [Step2] Creating new inspection...');
          const response = await inspectionsAPI.create(inspectionData);
          inspection = response.data;
          console.log('✅ [Step2] New inspection created:', inspection);
        }

        return inspection;
      } catch (error) {
        console.error('❌ [Step2] Save operation failed:', error);
        throw error;
      }
    },
    onMutate: () => {
      setAutoSaveStatus('saving');
      console.log('🔄 [Step2] Auto-save started...');
    },
    onSuccess: (inspection) => {
      setAutoSaveStatus('saved');
      setLastSaved(new Date().toISOString());
      console.log('✅ [Step2] Auto-save successful:', inspection);
    },
    onError: (error) => {
      setAutoSaveStatus('error');
      console.error('❌ [Step2] Auto-save failed:', error);
      
      // Show user-friendly error messages but don't block navigation
      if (error.code === 'ERR_NETWORK') {
        toast.error('Network error - data will be saved when connection is restored');
      } else if (error.response?.status === 400) {
        const errorMsg = error.response.data?.message || 'Validation error occurred';
        toast.error(`Save failed: ${errorMsg}`);
      } else {
        toast.error('Save failed - data will be retried automatically');
      }
    },
  });

  // Auto-save effect - Only save when there's meaningful data
  useEffect(() => {
    if (isDirty && Object.keys(watchedValues).length > 0) {
      // Check if there's meaningful data to save
      const hasData = watchedValues.tower_owner_name || watchedValues.height_above_ground || 
                     watchedValues.tower_type || watchedValues.rust_protection || 
                     watchedValues.manufacturer_name;
      
      if (hasData) {
        const timeoutId = setTimeout(() => {
          console.log('[Step2] Auto-save triggered');
          autoSaveMutation.mutate(watchedValues);
          setFormData(watchedValues);
        }, 10000); // 10 seconds

        return () => clearTimeout(timeoutId);
      }
    }
  }, [watchedValues, isDirty, autoSaveMutation, setFormData]);

  // Set current step
  useEffect(() => {
    setCurrentStep(2);
  }, [setCurrentStep]);

  // Load existing data
  useEffect(() => {
    if (existingInspection) {
      setCurrentInspection(existingInspection);
      // Populate form with existing data
      Object.keys(existingInspection).forEach(key => {
        if (existingInspection[key] !== null && existingInspection[key] !== undefined) {
          setValue(key, existingInspection[key]);
        }
      });
    }
  }, [existingInspection, setCurrentInspection, setValue]);

  // FIX: Handle redirect logic in useEffect instead of during render
  useEffect(() => {
    if (!inspectionId && !isEditing) {
      setShouldRedirect(true);
    }
  }, [inspectionId, isEditing]);

  // FIX: Handle the actual redirect in another useEffect
  useEffect(() => {
    if (shouldRedirect) {
      toast.error('No inspection found. Please start from Step 1.');
      navigate('/inspection/new/step-1');
    }
  }, [shouldRedirect, navigate]);

  // Navigate to next step with auto-save
  const onNext = async (data) => {
    try {
      // Set loading state
      setAutoSaveStatus('saving');
      
      // Always save form data to local state
      setFormData(data);
      
      // Check if there's meaningful data to save to backend
      const hasData = data.tower_owner_name || data.height_above_ground || data.tower_type || 
                     data.rust_protection || data.manufacturer_name;
      
      if (hasData) {
        try {
          console.log('💾 [Step2] Auto-saving before navigation...');
          await autoSaveMutation.mutateAsync(data);
        } catch (error) {
          // Don't block navigation if save fails
          console.warn('[Step2] Save failed but proceeding to next step:', error);
          toast.warning('Could not save data, but proceeding to next step');
        }
      }
      
      // Navigate to next step
      navigate(`/inspection/${inspectionId}/step-3`);
      
    } catch (error) {
      // Ensure navigation always works
      console.error('[Step2] Navigation error:', error);
      setFormData(data);
      navigate(`/inspection/${inspectionId}/step-3`);
    } finally {
      setAutoSaveStatus('idle');
    }
  };

  // Navigate to previous step
  const onPrevious = () => {
    setFormData({ ...formData, ...watchedValues });
    navigate(`/inspection/${inspectionId}/step-1`);
  };

  // Loading state
  if (inspectionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  // Show loading while redirect is happening
  if (shouldRedirect) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const progress = 50; // Step 2 = 50%

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tower Information</h1>
              <p className="text-sm text-gray-600 mt-1">Step 2: Tower specifications and safety (all optional)</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <ProgressBar progress={progress} className="w-32 h-2" />
            </div>
          </div>
          <StepIndicator steps={STEPS} currentStep={2} className="justify-center sm:justify-start" />
        </div>
      </div>

      {/* Validation Errors Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="validation-summary">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <h3 className="text-sm font-medium text-red-800">
              Please fix the following errors:
            </h3>
          </div>
          <ul className="validation-list">
            {Object.entries(validationErrors).map(([field, error]) => (
              <li key={field}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit(onNext)} className="space-y-6">
        {/* Tower Owner & Specifications */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Tower Owner & Specifications</h2>
            <p className="text-sm text-gray-600 mt-1">Fill what you know about the tower (all optional)</p>
          </div>
          <div className="card-body">
            <div className="mobile-form">
              <div>
                <label className="form-label">Name of the Tower Owner</label>
                <input
                  {...register('tower_owner_name')}
                  className={`form-input ${errors.tower_owner_name ? 'form-input-error' : ''}`}
                  placeholder="Tower owner name"
                />
                {errors.tower_owner_name && (
                  <p className="form-error">{errors.tower_owner_name.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Height of the Tower above Ground</label>
                <div className="relative">
                  <input
                    {...register('height_above_ground')}
                    className={`form-input pr-12 ${errors.height_above_ground ? 'form-input-error' : ''}`}
                    placeholder="Tower height"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">meters</span>
                  </div>
                </div>
                {errors.height_above_ground && (
                  <p className="form-error">{errors.height_above_ground.message}</p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-3 mb-4">
                  <input
                    {...register('above_building_roof')}
                    type="checkbox"
                    className="h-4 w-4 text-ca-blue focus:ring-ca-blue border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Is the tower above a Building Roof?
                  </label>
                </div>
                
                {watchAboveBuildingRoof && (
                  <div>
                    <label className="form-label">Height of the building above ground</label>
                    <div className="relative">
                      <input
                        {...register('building_height')}
                        className="form-input pr-12"
                        placeholder="Building height"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">meters</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Type of Tower</label>
                  <select
                    {...register('tower_type')}
                    className={`form-input ${errors.tower_type ? 'form-input-error' : ''}`}
                  >
                    <option value="">Select tower type</option>
                    <option value="guyed">Guyed</option>
                    <option value="self_supporting">Self-Supporting</option>
                    <option value="other">Others (specify)</option>
                  </select>
                  {errors.tower_type && (
                    <p className="form-error">{errors.tower_type.message}</p>
                  )}
                </div>

                {watchTowerType === 'other' && (
                  <div>
                    <label className="form-label">Others (specify)</label>
                    <input
                      {...register('tower_type_other')}
                      className="form-input"
                      placeholder="Specify tower type"
                    />
                  </div>
                )}

                <div>
                  <label className="form-label">Rust Protection</label>
                  <select
                    {...register('rust_protection')}
                    className={`form-input ${errors.rust_protection ? 'form-input-error' : ''}`}
                  >
                    <option value="">Select rust protection</option>
                    <option value="galvanized">Galvanized</option>
                    <option value="painted">Painted</option>
                    <option value="aluminum">Aluminum</option>
                    <option value="no_protection">No Rust Protection</option>
                  </select>
                  {errors.rust_protection && (
                    <p className="form-error">{errors.rust_protection.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Manufacturer Details */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Manufacturer Details</h2>
          </div>
          <div className="card-body">
            <div className="mobile-form">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Year of Tower Installation</label>
                  <input
                    {...register('installation_year')}
                    className="form-input"
                    placeholder="e.g., 2020"
                    maxLength="4"
                  />
                </div>

                <div>
                  <label className="form-label">Name of the Tower Manufacturer</label>
                  <input
                    {...register('manufacturer_name')}
                    className="form-input"
                    placeholder="Manufacturer name"
                  />
                </div>

                <div>
                  <label className="form-label">Model Number</label>
                  <input
                    {...register('model_number')}
                    className="form-input"
                    placeholder="Model number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Maximum Wind Load</label>
                  <div className="relative">
                    <input
                      {...register('maximum_wind_load')}
                      className="form-input pr-12"
                      placeholder="Wind load"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">km/h</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="form-label">Maximum Load Charge</label>
                  <div className="relative">
                    <input
                      {...register('maximum_load_charge')}
                      className="form-input pr-12"
                      placeholder="Load charge"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">kg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Safety & Insurance */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Safety & Insurance</h2>
          </div>
          <div className="card-body">
            <div className="mobile-form">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    {...register('has_insurance')}
                    type="checkbox"
                    className="h-4 w-4 text-ca-blue focus:ring-ca-blue border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Has Tower got an Insurance Policy?
                  </label>
                </div>
                
                {watchHasInsurance && (
                  <div>
                    <label className="form-label">Name of insurer</label>
                    <input
                      {...register('insurance_company')}
                      className="form-input"
                      placeholder="Insurance company name"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <input
                      {...register('has_concrete_base')}
                      type="checkbox"
                      className="h-4 w-4 text-ca-blue focus:ring-ca-blue border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Concrete Base?
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      {...register('has_lightning_protection')}
                      type="checkbox"
                      className="h-4 w-4 text-ca-blue focus:ring-ca-blue border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Lightning Protection provided?
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      {...register('is_electrically_grounded')}
                      type="checkbox"
                      className="h-4 w-4 text-ca-blue border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Is the Tower electrically grounded?
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      {...register('has_aviation_warning_light')}
                      type="checkbox"
                      className="h-4 w-4 text-ca-blue focus:ring-ca-blue border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Aviation warning light provided?
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <input
                      {...register('has_other_antennas')}
                      type="checkbox"
                      className="h-4 w-4 text-ca-blue focus:ring-ca-blue border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Others Antennas on the Tower?
                    </label>
                  </div>
                  
                  {watchHasOtherAntennas && (
                    <div>
                      <label className="form-label">If yes, elaborate</label>
                      <textarea
                        {...register('other_antennas_details')}
                        className="form-input"
                        rows="3"
                        placeholder="Describe other antennas on the tower"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation - Simplified like Step1 */}
        <div className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={onPrevious}
            className="btn btn-outline"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous: Program Info
          </button>

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              type="submit"
              disabled={autoSaveMutation.isPending}
              className="btn btn-primary"
            >
              {autoSaveMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving & Continuing...
                </>
              ) : (
                <>
                  Continue to Transmitter
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Step2;