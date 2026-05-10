import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { BRAND } from '../../lib/brandClasses';
import { cn } from '../../lib/utils';
import Input from './Input';

/**
 * Structured input for a list of people (parties or witnesses).
 *
 * @param {string}   label          e.g. "Parties" or "Witnesses"
 * @param {object[]} people         Array of person objects
 * @param {function} onChange       Callback(updatedPeople)
 * @param {boolean}  withIdentities Whether to show the Government IDs section (parties only)
 * @param {boolean}  required       Whether at least one person is required
 */
export default function PeopleInput({
  label = 'People',
  people = [],
  onChange,
  withIdentities = false,
  required = false,
}) {
  const singularLabel = label.endsWith('s') ? label.slice(0, -1) : label;

  const addPerson = () => {
    const newPerson = withIdentities
      ? { name: '', address: '', identities: [] }
      : { name: '', address: '' };
    onChange([...people, newPerson]);
  };

  const removePerson = (index) => {
    onChange(people.filter((_, i) => i !== index));
  };

  const updatePerson = (index, field, value) => {
    onChange(people.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const addIdentity = (personIndex) => {
    onChange(
      people.map((p, i) =>
        i === personIndex
          ? { ...p, identities: [...(p.identities || []), { id_type: '', id_number: '' }] }
          : p,
      ),
    );
  };

  const removeIdentity = (personIndex, idIndex) => {
    onChange(
      people.map((p, i) =>
        i === personIndex
          ? { ...p, identities: p.identities.filter((_, j) => j !== idIndex) }
          : p,
      ),
    );
  };

  const updateIdentity = (personIndex, idIndex, field, value) => {
    onChange(
      people.map((p, i) =>
        i === personIndex
          ? {
              ...p,
              identities: p.identities.map((id, j) =>
                j === idIndex ? { ...id, [field]: value } : id,
              ),
            }
          : p,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
        <button
          type="button"
          onClick={addPerson}
          className={cn('flex items-center gap-1', BRAND.chip)}
        >
          <Plus className="h-3 w-3" />
          Add {singularLabel}
        </button>
      </div>

      {/* Empty state */}
      {people.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 py-5 text-center dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No {label.toLowerCase()} added yet.{' '}
            <button
              type="button"
              className={cn(BRAND.link, 'text-xs')}
              onClick={addPerson}
            >
              Add one now.
            </button>
          </p>
        </div>
      )}

      {/* Person rows */}
      <div className="flex flex-col gap-3">
        {people.map((person, pIndex) => (
          <div
            key={pIndex}
            className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40"
          >
            {/* Person header */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {singularLabel} {pIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => removePerson(pIndex)}
                className="rounded p-0.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                title={`Remove ${singularLabel} ${pIndex + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Name + Address */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-xs text-slate-500 dark:text-slate-400">Name</label>
                <Input
                  value={person.name}
                  onChange={(e) => updatePerson(pIndex, 'name', e.target.value)}
                  placeholder="Full name"
                  required={required}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-slate-500 dark:text-slate-400">Address</label>
                <Input
                  value={person.address}
                  onChange={(e) => updatePerson(pIndex, 'address', e.target.value)}
                  placeholder="City / Province"
                />
              </div>
            </div>

            {/* Government IDs (parties only) */}
            {withIdentities && (
              <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Government IDs</span>
                  <button
                    type="button"
                    onClick={() => addIdentity(pIndex)}
                    className={BRAND.subControl}
                  >
                    <Plus className="h-3 w-3" />
                    Add ID
                  </button>
                </div>

                {(!person.identities || person.identities.length === 0) && (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500">No IDs recorded.</p>
                )}

                <div className="flex flex-col gap-1.5">
                  {(person.identities || []).map((identity, idIndex) => (
                    <div key={idIndex} className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        value={identity.id_type}
                        onChange={(e) =>
                          updateIdentity(pIndex, idIndex, 'id_type', e.target.value)
                        }
                        placeholder="Type (e.g. SSS, PhilHealth, TIN)"
                      />
                      <Input
                        className="flex-1"
                        value={identity.id_number}
                        onChange={(e) =>
                          updateIdentity(pIndex, idIndex, 'id_number', e.target.value)
                        }
                        placeholder="ID Number"
                      />
                      <button
                        type="button"
                        onClick={() => removeIdentity(pIndex, idIndex)}
                        className="shrink-0 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove ID"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
