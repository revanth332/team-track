import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Send, CheckCircle2, AlertCircle, Info, Shield, KeyRound, Server, Users, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bandwidthService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { BandwidthSettingsUpdate } from '../../types';

interface BandwidthMailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BandwidthMailModal({ isOpen, onClose }: BandwidthMailModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [isEnabled, setIsEnabled] = useState(false);
  const [senderEmail, setSenderEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [server, setServer] = useState('smtp.zoho.com');
  const [port, setPort] = useState(465);
  const [recipients, setRecipients] = useState('');
  const [minThreshold, setMinThreshold] = useState(0);
  const [testEmailOverride, setTestEmailOverride] = useState('');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['bandwidth-settings'],
    queryFn: () => bandwidthService.getSettings(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.is_enabled);
      setSenderEmail(settings.zoho_sender_email || '');
      setServer(settings.zoho_server || 'smtp.zoho.com');
      setPort(settings.zoho_port || 465);
      setRecipients((settings.recipient_emails || []).join(', '));
      setMinThreshold(settings.min_bandwidth_threshold || 0);
      setAppPassword(''); // Leave blank unless user types new password
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (payload: BandwidthSettingsUpdate) => bandwidthService.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bandwidth-settings'] });
      showToast('Daily bandwidth email settings saved successfully!', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Failed to save settings', 'error');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const recipientList = recipients
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const payload: BandwidthSettingsUpdate = {
      is_enabled: isEnabled,
      zoho_sender_email: senderEmail,
      zoho_server: server,
      zoho_port: Number(port),
      recipient_emails: recipientList,
      min_bandwidth_threshold: Number(minThreshold),
    };

    if (appPassword.trim()) {
      payload.zoho_app_password = appPassword.trim();
    }

    saveMutation.mutate(payload);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const recipientList = recipients
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const testRecipient = testEmailOverride.trim() || recipientList[0] || senderEmail;

    try {
      const res = await bandwidthService.testConnection({
        test_recipient_email: testRecipient,
        zoho_sender_email: senderEmail,
        zoho_app_password: appPassword.trim() || undefined,
        zoho_server: server,
        zoho_port: Number(port),
      });

      setTestResult(res);
      if (res.success) {
        showToast(res.message, 'success');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Test email failed to send.';
      setTestResult({ success: false, message: msg });
      showToast(msg, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Mail size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-on-surface">Daily Bandwidth Mailer</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Automated daily alert at 5:00 PM IST (Sends only if team bandwidth &gt; threshold)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status & Toggle Banner */}
            <div className="bg-surface-container-low/70 rounded-2xl p-4 border border-outline-variant/10 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-on-surface">Automated Daily Mail</span>
                  {settings?.last_run_status && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        settings.last_run_status === 'SUCCESS'
                          ? 'bg-green-100 text-green-700'
                          : settings.last_run_status === 'SKIPPED_NO_BANDWIDTH_MEMBERS'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      Last Run: {settings.last_run_status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant/70 font-medium">
                  {isEnabled
                    ? 'Active - Evaluates team members every day at 5:00 PM IST.'
                    : 'Disabled - Daily email dispatcher is currently turned off.'}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Credentials Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Shield size={14} />
                <span>Zoho Mail Credentials</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">
                    Lead Zoho Email Address *
                  </label>
                  <input
                    type="email"
                    required={isEnabled}
                    placeholder="lead.username@miraclesoft.com"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center justify-between">
                    <span>Zoho App Password {settings?.has_app_password ? '(Configured)' : '*'}</span>
                    {settings?.has_app_password && (
                      <span className="text-[10px] text-green-600 font-bold">Saved</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder={settings?.has_app_password ? '•••••••• (Encrypted in DB)' : 'Enter Zoho App Password'}
                      value={appPassword}
                      onChange={(e) => setAppPassword(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <KeyRound size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                  </div>
                </div>
              </div>

              {/* Security Hint */}
              <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 flex items-start gap-2.5 text-xs text-on-surface-variant font-medium">
                <Info size={16} className="text-primary shrink-0 mt-0.5" />
                <div>
                  Generate an <strong>App Password</strong> via{' '}
                  <a
                    href="https://accounts.zoho.com/u/h#security/app_passwords"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-bold hover:underline"
                  >
                    Zoho Security → App Passwords
                  </a>
                  . Password is encrypted using AES-256 before storing.
                </div>
              </div>

              {/* Server & Port Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <Server size={14} className="text-on-surface-variant/60" />
                    <span>Zoho Server Region</span>
                  </label>
                  <select
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="smtp.zoho.com">smtp.zoho.com (US / Global)</option>
                    <option value="smtp.zoho.in">smtp.zoho.in (India)</option>
                    <option value="smtp.zoho.eu">smtp.zoho.eu (Europe)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">SMTP Port (SSL)</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Mail Recipients & Threshold */}
            <div className="space-y-4 pt-2 border-t border-outline-variant/10">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Users size={14} />
                <span>Recipients & Criteria</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Recipient Email Addresses (Comma-separated) *
                </label>
                <textarea
                  rows={2}
                  required={isEnabled}
                  placeholder="manager@miraclesoft.com, resourcemanager@miraclesoft.com"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5 flex justify-between">
                  <span>Minimum Available Bandwidth Threshold</span>
                  <span className="text-primary font-bold">&gt; {minThreshold}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <p className="text-[11px] text-on-surface-variant/60 mt-1 font-medium">
                  Only members with bandwidth greater than {minThreshold}% will be included in the report. If no members meet this condition, email is safely skipped.
                </p>
              </div>
            </div>

            {/* Test Connection Banner */}
            <div className="bg-surface-container-low/40 rounded-2xl p-4 border border-outline-variant/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-on-surface">Test SMTP Connection</div>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting || (!senderEmail && !settings?.zoho_sender_email)}
                  className="px-3.5 py-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{isTesting ? 'Sending Test...' : 'Send Test Mail'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 ${
                    testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-green-600" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm text-on-surface-variant hover:bg-surface-container transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold shadow-md shadow-primary/10 transition-all active:scale-95 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
