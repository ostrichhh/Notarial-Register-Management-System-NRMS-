import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../ui/shadcn/Dialog';
import { Label } from '../ui/shadcn/Label';
import { Input } from '../ui/shadcn/Input';
import { Button } from '../ui/shadcn/Button';
import PasswordInput from '../ui/PasswordInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/shadcn/Select';
import { summarizeApiError } from '../../lib/friendlyErrors';

const ROLE_OPTIONS = [
  { value: 'ATTORNEY', label: 'Attorney (Primary Notary)' },
  { value: 'SECRETARY', label: 'Secretary (Legal Secretary)' },
  { value: 'ADMIN', label: 'Admin' },
];

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  role: 'SECRETARY',
  password: '',
};

export default function AddEditUserDialog({ open, onOpenChange, user, onSave }) {
  const isEditing = Boolean(user);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        username: user.username || '',
        role: user.role || 'SECRETARY',
        password: '', // never prefill
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [user, open]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required.';
    if (!form.last_name.trim()) errs.last_name = 'Last name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email.';
    if (!form.username.trim()) errs.username = 'Username is required.';
    if (!isEditing && form.password.length < 8)
      errs.password = 'Password must be at least 8 characters.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (isEditing) delete payload.password; // Admin cannot change password
      await onSave(payload, user?.id);
      onOpenChange(false);
    } catch (err) {
      const data = err?.response?.data;
      if (data) {
        const apiErrors = {};
        Object.keys(data).forEach((k) => {
          apiErrors[k] = summarizeApiError({ [k]: data[k] });
        });
        setErrors(apiErrors);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the staff member\'s information below.'
              : 'Fill in the details to register a new office staff member.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                placeholder="Julian"
                value={form.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
              />
              {errors.first_name && <p className="text-xs text-red-600">{errors.first_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                placeholder="Sterling"
                value={form.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
              />
              {errors.last_name && <p className="text-xs text-red-600">{errors.last_name}</p>}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="julian.sterling@nrms.legal"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
          </div>

          {/* Username + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="jsterling"
                value={form.username}
                onChange={(e) => handleChange('username', e.target.value)}
              />
              {errors.username && <p className="text-xs text-red-600">{errors.username}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role / Designation</Label>
              <Select
                value={form.role}
                onValueChange={(val) => handleChange('role', val)}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-red-600">{errors.role}</p>}
            </div>
          </div>

          {/* Password — Create only */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
              />
              {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
              <p className="text-xs text-slate-400">
                The user can change their password from the Settings page.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Staff Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
