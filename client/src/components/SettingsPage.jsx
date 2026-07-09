import React, { useState } from 'react';
import { 
  Sliders, 
  Cpu, 
  Bell, 
  Globe, 
  Database, 
  CheckCircle,
  Eye,
  Key
} from 'lucide-react';
import { showToast } from '../utils/toast';
import './SettingsPage.css';

export default function SettingsPage() {
  // General State
  const [theme, setTheme] = useState(localStorage.getItem('set_theme') || 'light');
  const [pageSize, setPageSize] = useState(localStorage.getItem('set_pageSize') || '100');
  const [language, setLanguage] = useState(localStorage.getItem('set_language') || 'en');

  // AI Configs
  const [autoExtract, setAutoExtract] = useState(localStorage.getItem('set_autoExtract') === 'true');
  const [strictDup, setStrictDup] = useState(localStorage.getItem('set_strictDup') === 'true');
  const [aiModel, setAiModel] = useState(localStorage.getItem('set_aiModel') || 'gemini-1.5-pro');

  // Notifications
  const [notifyEmail, setNotifyEmail] = useState(localStorage.getItem('set_notifyEmail') !== 'false');
  const [notifyPush, setNotifyPush] = useState(localStorage.getItem('set_notifyPush') === 'true');

  // API Configuration
  const [apiKey, setApiKey] = useState('sk_recruiter_••••••••••••••••••••');
  const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem('set_webhook') || 'https://api.workspace.com/v1/webhooks/resumes');

  // Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');

    setTimeout(() => {
      // Save to localStorage
      localStorage.setItem('set_theme', theme);
      localStorage.setItem('set_pageSize', pageSize);
      localStorage.setItem('set_language', language);
      localStorage.setItem('set_autoExtract', autoExtract);
      localStorage.setItem('set_strictDup', strictDup);
      localStorage.setItem('set_aiModel', aiModel);
      localStorage.setItem('set_notifyEmail', notifyEmail);
      localStorage.setItem('set_notifyPush', notifyPush);
      localStorage.setItem('set_webhook', webhookUrl);

      setIsSaving(false);
      setSuccessMsg('Settings saved successfully!');
      showToast('Workspace settings saved successfully!', 'save');
      
      // Clear message after 3 seconds
      setTimeout(() => setSuccessMsg(''), 3000);
    }, 1000);
  };

  return (
    <div className="settings-page-wrapper animate-fade-in">
      <div className="settings-page-header">
        <h2>Workspace Settings</h2>
        <p className="settings-subtitle">Manage candidate parsing variables, notification flows, and system parameters.</p>
      </div>

      <form onSubmit={handleSave} className="settings-form">
        <div className="settings-grid">
          {/* Section 1: General Preferences */}
          <div className="settings-card">
            <div className="settings-card-header">
              <Sliders size={18} className="sec-icon" />
              <h4>General Preferences</h4>
            </div>
            <div className="settings-card-body">
              <div className="form-group-custom">
                <label>Interface Theme</label>
                <div className="theme-toggle-group">
                  <button 
                    type="button" 
                    className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    Light
                  </button>
                  <button 
                    type="button" 
                    className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    Dark
                  </button>
                </div>
              </div>

              <div className="form-group-custom">
                <label htmlFor="set-limit">Candidates Directory Page Limit</label>
                <select 
                  id="set-limit"
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value)}
                >
                  <option value="50">50 records per page</option>
                  <option value="100">100 records per page</option>
                  <option value="200">200 records per page</option>
                </select>
              </div>

              <div className="form-group-custom">
                <label htmlFor="set-lang">System Language</label>
                <div className="select-with-icon">
                  <Globe size={16} className="select-icon" />
                  <select 
                    id="set-lang"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español (ES)</option>
                    <option value="fr">Français (FR)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: AI Parsing Options */}
          <div className="settings-card">
            <div className="settings-card-header">
              <Cpu size={18} className="sec-icon" />
              <h4>AI Parsing & Extraction</h4>
            </div>
            <div className="settings-card-body">
              <div className="form-group-custom">
                <label htmlFor="set-model">LLM Parsing Engine</label>
                <select 
                  id="set-model"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                >
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Optimized)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
                  <option value="gpt-4o">GPT-4o (Enhanced)</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                </select>
              </div>

              <div className="toggle-group-item">
                <div className="toggle-text">
                  <span className="toggle-label">Automatic Skill Tag Extraction</span>
                  <span className="toggle-description">Runs parsing agent on upload to auto-populate skill tags.</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={autoExtract} 
                    onChange={(e) => setAutoExtract(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="toggle-group-item">
                <div className="toggle-text">
                  <span className="toggle-label">Strict Duplicate Checking</span>
                  <span className="toggle-description">Performs deep vector checking on emails/phones to prevent duplicates.</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={strictDup} 
                    onChange={(e) => setStrictDup(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Notification Preferences */}
          <div className="settings-card">
            <div className="settings-card-header">
              <Bell size={18} className="sec-icon" />
              <h4>Notification Flows</h4>
            </div>
            <div className="settings-card-body">
              <div className="toggle-group-item">
                <div className="toggle-text">
                  <span className="toggle-label">Email Digest Alerts</span>
                  <span className="toggle-description">Send weekly summaries of candidate pipeline movements.</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={notifyEmail} 
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="toggle-group-item">
                <div className="toggle-text">
                  <span className="toggle-label">Desktop Push Notifications</span>
                  <span className="toggle-description">Receive immediate alerts when uploads complete processing.</span>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={notifyPush} 
                    onChange={(e) => setNotifyPush(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Webhook & Integration */}
          <div className="settings-card">
            <div className="settings-card-header">
              <Database size={18} className="sec-icon" />
              <h4>Integrations & Webhooks</h4>
            </div>
            <div className="settings-card-body">
              <div className="form-group-custom">
                <label htmlFor="set-apikey">Workspace API Key</label>
                <div className="input-with-icon">
                  <Key size={16} className="input-icon" />
                  <input 
                    id="set-apikey"
                    type="text" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group-custom">
                <label htmlFor="set-webhook">Resume Webhook Receiver URL</label>
                <div className="input-with-icon">
                  <Globe size={16} className="input-icon" />
                  <input 
                    id="set-webhook"
                    type="url" 
                    placeholder="https://api.domain.com/v1/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {successMsg && (
          <div className="settings-alert success">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="settings-action-bar">
          <button type="submit" className="settings-save-btn" disabled={isSaving}>
            {isSaving ? 'Saving Preferences...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
