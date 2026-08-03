import React, { useState, useEffect } from 'react';
import config from '../config';
import { apiClient } from '../apiClient';
import { X, Download, ExternalLink, FileText, AlertTriangle, Eye } from 'lucide-react';
import './ResumeModal.css';

export default function ResumeModal({ candidateId, candidateName, resumeKey, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [rawText, setRawText] = useState(null);
  const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' | 'text'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileType, setFileType] = useState('pdf');

  useEffect(() => {
    let isMounted = true;
    let createdUrl = null;

    const fetchResume = async () => {
      if (!candidateId) return;
      setIsLoading(true);
      setError(null);

      try {
        // Determine file type from extension
        const ext = (resumeKey || '').split('.').pop().toLowerCase();
        if (ext === 'docx' || ext === 'doc') {
          setFileType('doc');
          setActiveTab('text');
        } else {
          setFileType('pdf');
          setActiveTab('pdf');
        }

        // Fetch binary blob for PDF iframe
        const response = await apiClient(`${config.apiBaseUrl}/api/files/resume/${candidateId}`);
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error || 'Failed to load resume file from server.');
        }

        const contentType = response.headers.get('content-type') || 'text/html';
        const blob = await response.blob();

        if (isMounted) {
          const typedBlob = new Blob([blob], { type: contentType });
          createdUrl = URL.createObjectURL(typedBlob);
          setBlobUrl(createdUrl);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error opening resume preview.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchResume();

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [candidateId, resumeKey]);

  const handleDownload = () => {
    if (candidateId) {
      window.open(`${config.apiBaseUrl}/api/files/resume/${candidateId}?download=true`, '_blank');
    } else if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = resumeKey ? resumeKey.split('/').pop() : 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const fileName = resumeKey ? resumeKey.split('/').pop() : 'Resume Document';

  return (
    <div className="resume-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="resume-modal-card animate-scale-up">
        {/* Header */}
        <div className="resume-modal-header">
          <div className="resume-modal-title-group">
            <div className="resume-modal-icon-badge">
              <FileText size={18} />
            </div>
            <div>
              <h3>{candidateName || 'Candidate'}'s Resume</h3>
              <p className="resume-modal-filename">{fileName}</p>
            </div>
          </div>

          <div className="resume-modal-header-actions">
            {blobUrl && (
              <>
                <button
                  type="button"
                  className="resume-action-btn secondary"
                  onClick={handleOpenNewTab}
                  title="Open in new tab"
                >
                  <ExternalLink size={14} />
                  <span>Full Screen</span>
                </button>
                <button
                  type="button"
                  className="resume-action-btn primary"
                  onClick={handleDownload}
                  title="Download file"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
              </>
            )}
            <button
              type="button"
              className="resume-modal-close-btn"
              onClick={onClose}
              title="Close modal (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="resume-modal-body">
          {isLoading ? (
            <div className="resume-modal-loading">
              <div className="spinner-large" />
              <p>Loading document preview...</p>
            </div>
          ) : error ? (
            <div className="resume-modal-error">
              <AlertTriangle size={32} style={{ color: '#ef4444', marginBottom: '12px' }} />
              <h4>Unable to load preview</h4>
              <p>{error}</p>
              <button className="resume-action-btn secondary" onClick={onClose} style={{ marginTop: '16px' }}>
                Close Preview
              </button>
            </div>
          ) : (
            <div className="resume-preview-container">
              {blobUrl && (
                <iframe
                  src={blobUrl}
                  title={`Resume preview for ${candidateName}`}
                  className="resume-pdf-iframe"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
