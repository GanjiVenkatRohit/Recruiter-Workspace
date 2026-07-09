import React, { useState } from 'react';
import { User, Mail, Phone, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { showToast } from '../utils/toast';
import './ProfilePage.css';

export default function ProfilePage({ user }) {
  const [name, setName] = useState(user?.name || 'Recruiter Admin');
  const [email] = useState(user?.email || 'admin@workspace.com');
  const [phone, setPhone] = useState(localStorage.getItem('recruiter_phone') || '+1 (555) 019-2834');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Feedback states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess('');
    
    setTimeout(() => {
      localStorage.setItem('recruiter_phone', phone);
      setIsSavingProfile(false);
      setProfileSuccess('Profile details updated successfully!');
      showToast('Profile details updated successfully!', 'save');
      
      // Clear message after 3 seconds
      setTimeout(() => setProfileSuccess(''), 3000);
    }, 1000);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    setTimeout(() => {
      setIsChangingPassword(false);
      setPasswordSuccess('Password changed successfully!');
      showToast('Password changed successfully!', 'save');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear message after 3 seconds
      setTimeout(() => setPasswordSuccess(''), 3000);
    }, 1000);
  };

  return (
    <div className="profile-page-wrapper animate-fade-in">
      <div className="profile-page-header">
        <h2>Profile Management</h2>
        <p className="profile-subtitle">Update your personal details and account credentials.</p>
      </div>

      <div className="profile-grid">
        {/* Left Side: Avatar Card */}
        <div className="profile-card">
          <div className="profile-card-avatar">
            {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <h3>{name}</h3>
          <p className="profile-role">Recruiter Lead</p>
          <div className="profile-meta-info">
            <div className="meta-item">
              <Mail size={15} />
              <span>{email}</span>
            </div>
            <div className="meta-item">
              <Phone size={15} />
              <span>{phone}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Tab Forms */}
        <div className="profile-forms-container">
          {/* Form 1: General Info */}
          <form className="profile-form-card" onSubmit={handleProfileSubmit}>
            <h4>Personal Details</h4>
            
            <div className="profile-form-grid">
              <div className="form-group-custom">
                <label htmlFor="prof-name">Full Name</label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input
                    id="prof-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group-custom">
                <label htmlFor="prof-email">Email Address</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input
                    id="prof-email"
                    type="email"
                    required
                    disabled
                    value={email}
                    title="Email cannot be changed"
                  />
                </div>
              </div>

              <div className="form-group-custom">
                <label htmlFor="prof-phone">Phone Number</label>
                <div className="input-with-icon">
                  <Phone size={16} className="input-icon" />
                  <input
                    id="prof-phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {profileSuccess && (
              <div className="profile-alert success">
                <CheckCircle size={16} />
                <span>{profileSuccess}</span>
              </div>
            )}

            <div className="btn-wrap">
              <button type="submit" className="profile-save-btn" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>

          {/* Form 2: Password Change */}
          <form className="profile-form-card" onSubmit={handlePasswordSubmit}>
            <h4>Security Credentials</h4>
            
            <div className="profile-form-grid">
              <div className="form-group-custom">
                <label htmlFor="prof-curr-pass">Current Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="prof-curr-pass"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group-custom">
                <label htmlFor="prof-new-pass">New Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="prof-new-pass"
                    type="password"
                    required
                    placeholder="•••••••• (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group-custom">
                <label htmlFor="prof-conf-pass">Confirm New Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="prof-conf-pass"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {passwordError && (
              <div className="profile-alert error">
                <AlertCircle size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="profile-alert success">
                <CheckCircle size={16} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="btn-wrap">
              <button type="submit" className="profile-save-btn secondary" disabled={isChangingPassword}>
                {isChangingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
