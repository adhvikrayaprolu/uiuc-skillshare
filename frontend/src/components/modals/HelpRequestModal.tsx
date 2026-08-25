import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { InitialsAvatar } from '../ui/InitialsAvatar';

interface HelpRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientSkills?: string[];
  onSubmitRequest?: (payload: {
    topic: string;
    relatedSkill: string;
    message: string;
    urgency: 'low' | 'medium' | 'high';
    preferredContactMethod: string;
  }) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function HelpRequestModal({
  isOpen,
  onClose,
  recipientName,
  recipientSkills = [],
  onSubmitRequest,
  isSubmitting = false
}: HelpRequestModalProps) {
  const [topic, setTopic] = useState('');
  const [relatedSkill, setRelatedSkill] = useState('');
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [preferredContact, setPreferredContact] = useState('email');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitRequest?.({
      topic,
      relatedSkill,
      message,
      urgency: urgency.toLowerCase() as 'low' | 'medium' | 'high',
      preferredContactMethod: preferredContact,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <InitialsAvatar name={recipientName} size="sm" />
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">Send Help Request</h2>
              <p className="text-sm text-[#64748B]">to {recipientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              Topic <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Resume review for internship applications"
              required
              className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#13294B] transition-colors"
            />
          </div>

          {/* Related Skill */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              Related Skill <span className="text-[#64748B] font-normal">(optional)</span>
            </label>
            <select
              value={relatedSkill}
              onChange={(e) => setRelatedSkill(e.target.value)}
              className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#13294B] transition-colors"
            >
              <option value="">General / not listed</option>
              {recipientSkills.map((skill, i) => (
                <option key={i} value={skill}>{skill}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              Message <span className="text-[#DC2626]">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you need help with..."
              required
              rows={5}
              className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#13294B] transition-colors resize-none"
            />
            <p className="text-xs text-[#64748B] mt-2">
              Be specific about what you need help with and any relevant context
            </p>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              Urgency
            </label>
            <div className="flex gap-3">
              {(['Low', 'Medium', 'High'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUrgency(level)}
                  className={`flex-1 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                    urgency === level
                      ? 'bg-[#13294B] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E8EEF7]'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Contact */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              Your Preferred Contact Method
            </label>
            <select
              value={preferredContact}
              onChange={(e) => setPreferredContact(e.target.value)}
              className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#13294B] transition-colors"
            >
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="phone">Phone</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Info Note */}
          <div className="bg-[#E8EEF7] rounded-xl p-4">
            <p className="text-sm text-[#13294B]">
              <strong>Note:</strong> After {recipientName} accepts your request, you'll coordinate directly using the shared contact method. This is not a messaging platform.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-[#E2E8F0] text-[#64748B] font-medium rounded-xl hover:bg-[#F8FAFC] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-[#13294B] text-white font-medium rounded-xl hover:bg-[#1a3a6b] transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
