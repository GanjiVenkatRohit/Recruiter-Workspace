import React, { useState, useEffect, useRef } from 'react';
import config from '../config';
import { apiClient } from '../apiClient';
import wsClient from '../utils/webSocketClient';
import { createResumableUpload } from '../utils/resumableUpload';
import { Paperclip, UploadCloud, X } from 'lucide-react';
import { showToast } from '../utils/toast';
import './UploadPanel.css';
import './AddCandidateForm.css';

const STATUSES_POOL = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected'];
const SOURCES_POOL = ['Referral', 'Job board', 'Direct', 'Other'];

async function computeSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export default function AddCandidateForm({ isOpen, onClose, onSuccess, onSelectCandidate }) {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'upload'

  // Manual Tab Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState([]);
  const [status, setStatus] = useState('Applied');
  const [source, setSource] = useState('Referral');
  const [notes, setNotes] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [experience, setExperience] = useState('');

  // Upload Tab State
  const [uploadFile, setUploadFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'uploading' | 'completed' | 'failed'
  const [duplicateCandidate, setDuplicateCandidate] = useState(null);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (activeTab === 'manual') {
        setResumeFile(e.dataTransfer.files[0]);
      } else {
        setUploadFile(e.dataTransfer.files[0]);
        setUploadStatus('idle');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      if (activeTab === 'manual') {
        setResumeFile(e.target.files[0]);
      } else {
        setUploadFile(e.target.files[0]);
        setUploadStatus('idle');
      }
    }
  };

  // Add skill tag handler
  const handleAddSkill = (e) => {
    e.preventDefault();
    const cleanSkill = skillInput.trim();
    if (cleanSkill && !skills.includes(cleanSkill)) {
      setSkills([...skills, cleanSkill]);
      setSkillInput('');
    }
  };

  // Remove skill tag handler
  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const validateManualForm = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required.';
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit manual candidate creation
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!validateManualForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (wsClient.clientId) {
        headers['X-Client-Id'] = wsClient.clientId;
      }

      const res = await apiClient(`${config.apiBaseUrl}/api/candidates`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          location: location.trim() || null,
          skills,
          status,
          source,
          notes: notes.trim() || null,
          experience: experience === '' ? null : parseFloat(experience),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        if (errData.error) {
          if (errData.error.toLowerCase().includes('email')) {
            setErrors({ email: errData.error });
          } else if (errData.error.toLowerCase().includes('phone')) {
            setErrors({ phone: errData.error });
          } else {
            setErrors({ general: errData.error });
          }
        } else {
          throw new Error('Failed to create candidate.');
        }
        return;
      }

      const newCandidate = await res.json();

      if (resumeFile) {
        setUploadStatus('uploading');
        await new Promise((resolve, reject) => {
          const controller = createResumableUpload(resumeFile, newCandidate.id, {
            onProgress: (progress) => {
              setUploadProgress(progress);
            },
            onComplete: (result) => {
              setUploadStatus('completed');
              newCandidate.resume_s3_key = result.filePath;
              showToast('Resume uploaded successfully!', 'upload');
              resolve();
            },
            onError: (err) => {
              setUploadStatus('failed');
              reject(err);
            },
          });
          controller.start();
        });
        
        // Show success screen for 2 seconds before closing
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      setName('');
      setEmail('');
      setPhone('');
      setLocation('');
      setSkillInput('');
      setSkills([]);
      setStatus('Applied');
      setSource('Referral');
      setNotes('');
      setExperience('');
      setResumeFile(null);

      if (onSuccess) onSuccess(newCandidate);
      showToast('Candidate created successfully!', 'success');
      onClose();
    } catch (err) {
      setErrors({ general: err.message || 'Server error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resume Upload Intake Stream Flow
  const handleResumeIntakeSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setErrors({ general: 'Please select a resume file first.' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setUploadStatus('uploading');

    try {
      // 1. Checksum calculation
      const checksum = await computeSHA256(uploadFile);

      // 2. Dedup check
      const dedupRes = await apiClient(`${config.orchestratorUrl}/orchestrator/dedup-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checksum }),
      });

      if (!dedupRes.ok) {
        throw new Error('Failed to verify resume deduplication status.');
      }

      const dedupResult = await dedupRes.json();
      if (dedupResult.duplicate) {
        setDuplicateCandidate({
          existingCandidateId: dedupResult.existingCandidateId,
          existingUploadId: dedupResult.existingUploadId,
        });
        setIsSubmitting(false);
        setUploadStatus('idle');
        return;
      }

      // 3. Create Draft Candidate profile
      const placeholderUuid = crypto.randomUUID();
      const draftEmail = `draft_${placeholderUuid.slice(0, 8)}@placeholder.com`;
      const draftRes = await apiClient(`${config.apiBaseUrl}/api/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Draft Candidate',
          email: draftEmail,
          status: 'Draft',
          skills: []
        }),
      });

      if (!draftRes.ok) {
        const errBody = await draftRes.json();
        throw new Error(errBody.error || 'Failed to provision Draft candidate profile.');
      }

      const draftCandidate = await draftRes.json();
      const candidateId = draftCandidate.id;

      // 4. Get Credentials
      const credsRes = await apiClient(`${config.orchestratorUrl}/orchestrator/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, fileName: uploadFile.name }),
      });

      if (!credsRes.ok) {
        throw new Error('Failed to request upload credentials.');
      }

      const creds = await credsRes.json();

      // 5. Validate
      const validateRes = await apiClient(`${config.orchestratorUrl}/orchestrator/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadToken: creds.token,
          candidateId,
          fileName: uploadFile.name,
          fileSizeBytes: uploadFile.size,
          mimeType: uploadFile.type || 'application/octet-stream',
        }),
      });

      if (!validateRes.ok) {
        const valErr = await validateRes.json();
        throw new Error(valErr.reason || 'Credentials validation failed.');
      }

      const validateResult = await validateRes.json();
      const uploadId = validateResult.uploadId;

      // Dispatch upload-started event to notifier
      window.dispatchEvent(
        new CustomEvent('upload-started', {
          detail: {
            uploadId,
            candidateId,
            fileName: uploadFile.name,
          },
        })
      );

      // 6. Start Chunked Upload
      await new Promise((resolve, reject) => {
        const controller = createResumableUpload(uploadFile, candidateId, {
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
          onComplete: () => {
            resolve();
          },
          onError: (err) => {
            reject(err);
          },
        });
        controller.start();
      });

      // 7. Register checksum with candidateId and uploadId
      await apiClient(`${config.orchestratorUrl}/orchestrator/dedup-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checksum, candidateId, uploadId }),
      });

      // 8. Poll status until completed or failed
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await apiClient(`${config.orchestratorUrl}/orchestrator/status/${uploadId}`);
          if (res.ok) {
            const match = await res.json();
            if (match) {
              if (match.status === 'completed') {
                clearInterval(pollIntervalRef.current);
                setUploadStatus('completed');
                
                // Fetch the auto-created candidate record using final candidate ID from merge
                const finalCandidateId = match.candidate_id || candidateId;
                const candRes = await apiClient(`${config.apiBaseUrl}/api/candidates/${finalCandidateId}`);
                if (candRes.ok) {
                  const finalCandidate = await candRes.json();
                  if (onSuccess) onSuccess(finalCandidate);
                }
                showToast('Resume uploaded and parsed successfully!', 'upload');
                
                // Show the success screen for 2 seconds, then close automatically
                setTimeout(() => {
                  setUploadFile(null);
                  setUploadStatus('idle');
                  setUploadProgress(0);
                  setIsSubmitting(false);
                  onClose();
                }, 2000);
              } else if (match.status === 'failed') {
                clearInterval(pollIntervalRef.current);
                setUploadStatus('failed');
                setIsSubmitting(false);
                setErrors({ general: match.error_message || 'Resume parsing failed.' });
              }
            }
          }
        } catch (pollErr) {
          console.error('Error polling status:', pollErr);
        }
      }, 2000);

    } catch (err) {
      setErrors({ general: err.message || 'Upload failed.' });
      setUploadStatus('failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card animate-scale-up">
        <div className="modal-header">
          <h3>Add New Candidate</h3>
          <button className="close-modal-btn" onClick={onClose} disabled={isSubmitting}>✕</button>
        </div>

        {uploadStatus === 'completed' ? (
          <div className="modal-success-state" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            textAlign: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#d1fae5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg className="css-icon" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ width: '32px', height: '32px' }}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h4 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Resume Uploaded Successfully!</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', maxWidth: '300px' }}>
              The candidate details have been parsed and added to your workspace.
            </p>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Closing automatically...</span>
          </div>
        ) : (
          <>
            {/* Tab Selection Headers */}
            <div className="form-tabs">
              <button
                type="button"
                className={`form-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                onClick={() => !isSubmitting && setActiveTab('manual')}
                disabled={isSubmitting}
              >
                Enter manually
              </button>
              <button
                type="button"
                className={`form-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => !isSubmitting && setActiveTab('upload')}
                disabled={isSubmitting}
              >
                Upload resume
              </button>
            </div>

            {/* General Error Banner */}
            {errors.general && (
              <div className="form-error-banner" style={{ margin: '0 24px 16px 24px' }}>
                <svg className="css-icon svg-alert" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, width: '16px', height: '16px' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                {errors.general}
              </div>
            )}

            {/* Manual Tab Layout */}
            {activeTab === 'manual' && (
              <form onSubmit={handleManualSubmit} className="modal-form">
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="required-label">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={errors.name ? 'error-input' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.name && <span className="field-error-msg">{errors.name}</span>}
                  </div>

                  <div className="form-group flex-1">
                    <label className="required-label">Email Address</label>
                    <input
                      type="text"
                      placeholder="e.g. john.doe@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? 'error-input' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.email && <span className="field-error-msg">{errors.email}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-group flex-1">
                    <label>Location (City)</label>
                    <input
                      type="text"
                      placeholder="e.g. Seattle"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Skills / Expertise</label>
                  <div className="skills-tag-input-container">
                    <input
                      type="text"
                      placeholder="Type skill & press Enter"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill(e);
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="add-skill-tag-btn"
                      onClick={handleAddSkill}
                      disabled={isSubmitting}
                    >
                      Add
                    </button>
                  </div>

                  {skills.length > 0 && (
                    <div className="form-skills-chips">
                      {skills.map((s) => (
                        <span key={s} className="skill-chip">
                          {s}
                          <button
                            type="button"
                            className="chip-remove"
                            onClick={() => handleRemoveSkill(s)}
                            disabled={isSubmitting}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Initial Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={isSubmitting}>
                      {STATUSES_POOL.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group flex-1">
                    <label>Source</label>
                    <select value={source} onChange={(e) => setSource(e.target.value)} disabled={isSubmitting}>
                      {SOURCES_POOL.map((src) => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group flex-1">
                    <label>Experience (Years)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      placeholder="e.g. 5"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="form-upload-group">
                  <label>Resume / CV</label>
                  {!resumeFile ? (
                    <div
                      className={`drag-drop-zone ${dragActive ? 'active' : ''}`}
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('form-file-input-manual').click()}
                    >
                      <span className="upload-icon-main"><UploadCloud size={20} /></span>
                      <p className="drag-instructions">
                        Drag & Drop candidate resume here, or browse files
                      </p>
                      <input
                        id="form-file-input-manual"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden-file-input"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div className="form-upload-file-card">
                      <div className="form-upload-file-info">
                        <span className="form-upload-filename">
                          <Paperclip size={14} style={{ marginRight: '6px' }} />
                          {resumeFile.name}
                        </span>
                        <button
                          type="button"
                          className="form-upload-remove-btn"
                          onClick={() => setResumeFile(null)}
                          disabled={isSubmitting}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Recruiter Notes</label>
                  <textarea
                    placeholder="Add summary info, screening highlights..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-form-btn" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-form-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Adding...' : 'Add Candidate'}
                  </button>
                </div>
              </form>
            )}

            {/* Upload Resume Tab Layout */}
            {activeTab === 'upload' && (
              <form onSubmit={handleResumeIntakeSubmit} className="modal-form">
                <div className="form-upload-group">
                  <label>Upload Candidate Resume</label>
                  {!uploadFile ? (
                    <div
                      className={`drag-drop-zone ${dragActive ? 'active' : ''}`}
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('form-file-input-upload').click()}
                    >
                      <span className="upload-icon-main"><UploadCloud size={20} /></span>
                      <p className="drag-instructions">
                        Drag & Drop candidate resume here, or browse files
                      </p>
                      <span className="supported-formats-text">Supported formats: PDF, DOC, DOCX, TXT (Max 20MB)</span>
                      <input
                        id="form-file-input-upload"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden-file-input"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div className="form-upload-file-card">
                      <div className="form-upload-file-info">
                        <span className="form-upload-filename">
                          <Paperclip size={14} style={{ marginRight: '6px' }} />
                          {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                        <button
                          type="button"
                          className="form-upload-remove-btn"
                          onClick={() => {
                            setUploadFile(null);
                            setUploadStatus('idle');
                            setUploadProgress(0);
                          }}
                          disabled={isSubmitting}
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {uploadStatus === 'uploading' && (
                        <div className="form-upload-progress-container">
                          <div className="form-upload-progress-bar">
                            <div className="form-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <span className="form-upload-percentage">{uploadProgress}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-form-btn" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-form-btn" disabled={isSubmitting || !uploadFile}>
                    {isSubmitting ? 'Uploading & Processing...' : 'Start Upload'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Duplicate Resume Confirmation Dialog Modal */}
      {duplicateCandidate && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card animate-scale-up" style={{ maxWidth: '400px', padding: '24px', gap: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-h)' }}>Duplicate Resume Detected</h4>
            <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0 }}>
              A candidate profile already exists for this resume. Would you like to view the existing profile?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                className="cancel-form-btn"
                onClick={() => {
                  setDuplicateCandidate(null);
                  setUploadFile(null);
                  setUploadStatus('idle');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="submit-form-btn"
                onClick={() => {
                  if (onSelectCandidate) {
                    onSelectCandidate(duplicateCandidate.existingCandidateId);
                  }
                  setDuplicateCandidate(null);
                  onClose();
                }}
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
