import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';


type Guest = {
  id: string;
  last_name: string;
  guests_allowed: number;
  plus_one_allowed: boolean;
  rsvp_status: string;
  meal_choice: string | null;
  dietary_notes: string | null;
  email: string | null;
};

type Step = 'attendance' | 'details' | 'done';

export default function RSVPForm() {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [step, setStep] = useState<Step>('attendance');
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [mealChoice, setMealChoice] = useState('');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('wedding_guest');
    if (!stored) {
      window.location.href = '/rsvp';
      return;
    }
    const g: Guest = JSON.parse(stored);
    setGuest(g);
    // Pre-fill existing values if they've RSVPd before
    setAttending(g.rsvp_status === 'attending' ? true : g.rsvp_status === 'declined' ? false : null);
    setGuestCount(g.guests_allowed);
    setMealChoice(g.meal_choice || '');
    setDietaryNotes(g.dietary_notes || '');
    setEmail(g.email || '');
  }, []);

  const handleAttendance = (value: boolean) => {
    setAttending(value);
    if (!value) {
      submitRSVP(false);
    } else {
      setStep('details');
    }
  };

  const submitRSVP = async (isAttending: boolean) => {
    if (!guest) return;
    setSaving(true);
    setError('');

    const { error: err } = await supabase
      .from('invitations')
      .update({
        rsvp_status: isAttending ? 'attending' : 'declined',
        meal_choice: isAttending ? mealChoice : null,
        dietary_notes: isAttending ? dietaryNotes : null,
        email: email || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', guest.id);

    if (err) {
      setError('Something went wrong saving your RSVP. Please try again.');
      setSaving(false);
      return;
    }

    // Update session storage with new status
    sessionStorage.setItem('wedding_guest', JSON.stringify({
      ...guest,
      rsvp_status: isAttending ? 'attending' : 'declined',
      meal_choice: isAttending ? mealChoice : null,
    }));

    setStep('done');
    setSaving(false);
  };

  if (!guest) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--swan-brown)' }}>
      Loading your invitation...
    </div>
  );

  return (
    <div className="rsvp-form-wrap">

      {/* GUEST BADGE */}
      <div className="guest-badge">
        <span className="guest-badge-label">Invitation for</span>
        <span className="guest-badge-name">The {guest.last_name} Party</span>
        <span className="guest-badge-guests">Up to {guest.guests_allowed} guest{guest.guests_allowed !== 1 ? 's' : ''}</span>
      </div>

      {/* STEP: ATTENDANCE */}
      {step === 'attendance' && (
        <div className="rsvp-step">
          <span className="section-label">Step One of Two</span>
          <h2>Will you be joining us?</h2>
          <div className="attendance-choices">
            <button
              className={`attendance-btn ${attending === true ? 'selected' : ''}`}
              onClick={() => handleAttendance(true)}
            >
              <span className="attendance-btn-title">Joyfully Accepts</span>
              <span className="attendance-btn-sub">I will be there</span>
            </button>
            <button
              className={`attendance-btn ${attending === false ? 'selected decline' : ''}`}
              onClick={() => handleAttendance(false)}
            >
              <span className="attendance-btn-title">Regretfully Declines</span>
              <span className="attendance-btn-sub">I am unable to attend</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP: DETAILS */}
      {step === 'details' && (
        <div className="rsvp-step">
          <span className="section-label">Step Two of Two</span>
          <h2>A few details</h2>

          <div className="form-group">
            <label className="form-label">Number of guests attending</label>
            <div className="guest-counter">
              <button
                className="counter-btn"
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                type="button"
              >−</button>
              <span className="counter-value">{guestCount}</span>
              <button
                className="counter-btn"
                onClick={() => setGuestCount(Math.min(guest.guests_allowed, guestCount + 1))}
                type="button"
              >+</button>
              <span className="counter-max">of {guest.guests_allowed} allowed</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Meal preference</label>
            <div className="meal-choices">
              {['Chicken', 'Fish', 'Vegetarian'].map((meal) => (
                <button
                  key={meal}
                  type="button"
                  className={`meal-btn ${mealChoice === meal ? 'selected' : ''}`}
                  onClick={() => setMealChoice(meal)}
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dietary">Dietary notes (optional)</label>
            <input
              className="form-input"
              type="text"
              id="dietary"
              placeholder="Allergies, dietary restrictions..."
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address (for day-of updates)</label>
            <input
              className="form-input"
              type="email"
              id="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && <div className="error-msg visible">{error}</div>}

          <div className="step-actions">
            <button
              className="btn"
              type="button"
              onClick={() => setStep('attendance')}
            >
              Back
            </button>
            <button
              className="btn btn-filled"
              type="button"
              onClick={() => submitRSVP(true)}
              disabled={saving || !mealChoice}
            >
              {saving ? 'Saving...' : 'Submit RSVP'}
            </button>
          </div>
          {!mealChoice && (
            <p className="meal-hint">Please select a meal preference to continue.</p>
          )}
        </div>
      )}

      {/* STEP: DONE */}
      {step === 'done' && (
        <div className="rsvp-step rsvp-done">
          <div className="done-diamond">✦</div>
          {attending ? (
            <>
              <h2>We'll see you there.</h2>
              <p>Your RSVP has been received. We are so looking forward to celebrating with you on June 14th.</p>
              {email && <p className="done-email">A confirmation will be sent to <strong>{email}</strong>.</p>}
            </>
          ) : (
            <>
              <h2>You will be missed.</h2>
              <p>We're sorry you won't be able to join us, but we appreciate you letting us know. We hope to celebrate with you another time.</p>
            </>
          )}
          <div className="done-details">
            <span>June 14, 2025</span>
            <span>·</span>
            <span>Hudson Valley, New York</span>
          </div>
          <button
            className="btn"
            onClick={() => setStep('attendance')}
          >
            Edit My Response
          </button>
        </div>
      )}

    </div>
  );
}