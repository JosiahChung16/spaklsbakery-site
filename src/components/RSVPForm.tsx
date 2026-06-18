import { useState, useEffect } from 'react';

type Guest = {
  id: string;
  full_name: string;
  rsvp_status: string;
  meal_choice: string | null;
  dietary_notes: string | null;
};

type Household = {
  id: string;
  last_name: string;
  email: string | null;
};

type Session = {
  invite_code: string;
  household: Household;
  guests: Guest[];
};

const MEALS = ['Meat', 'Vegetarian'];
const SUBMIT_URL = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/submit-rsvp`;
const ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export default function RSVPForm() {
  const [session, setSession] = useState<Session | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('wedding_session');
    if (!stored) {
      window.location.href = '/rsvp';
      return;
    }
    const s: Session = JSON.parse(stored);
    setSession(s);
    setGuests(s.guests);
    setEmail(s.household.email || '');
    setLoading(false);
  }, []);

  const updateGuest = (id: string, changes: Partial<Guest>) => {
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...changes } : g)));
  };

  const setAttendance = (id: string, status: 'attending' | 'declined') => {
    const changes: Partial<Guest> = { rsvp_status: status };
    if (status === 'declined') changes.meal_choice = null;
    updateGuest(id, changes);
  };

  const allAnswered = guests.every((g) => g.rsvp_status === 'attending' || g.rsvp_status === 'declined');
  const attendingNeedMeal = guests.filter((g) => g.rsvp_status === 'attending' && !g.meal_choice);
  const canSubmit = allAnswered && attendingNeedMeal.length === 0;

  const submitAll = async () => {
    if (!session) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          invite_code: session.invite_code,
          email,
          guests: guests.map((g) => ({
            id: g.id,
            rsvp_status: g.rsvp_status,
            meal_choice: g.meal_choice,
            dietary_notes: g.dietary_notes,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong saving your RSVP. Please try again.');
        setSaving(false);
        return;
      }

      // Update the stored session so a re-open shows saved state
      sessionStorage.setItem('wedding_session', JSON.stringify({
        ...session,
        household: { ...session.household, email },
        guests,
      }));

      setSaving(false);
      setDone(true);
    } catch (_err) {
      setError('Something went wrong. Please check your connection and try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--swan-brown)' }}>
        Loading your invitation...
      </div>
    );
  }

  const anyAttending = guests.some((g) => g.rsvp_status === 'attending');

  return (
    <div className="rsvp-form-wrap">

      <div className="guest-badge">
        <span className="guest-badge-label">Invitation for</span>
        <span className="guest-badge-name">The {session?.household.last_name} Household</span>
        <span className="guest-badge-guests">{guests.length} guest{guests.length !== 1 ? 's' : ''} invited</span>
      </div>

      {done ? (
        <div className="rsvp-step rsvp-done">
          <div className="done-diamond">✦</div>
          {anyAttending ? (
            <>
              <h2>Thank you — we can't wait.</h2>
              <p>Your responses have been recorded for everyone in your household. We are so looking forward to celebrating with you on March 7th.</p>
            </>
          ) : (
            <>
              <h2>You will be missed.</h2>
              <p>We're sorry your household won't be able to join us, but we appreciate you letting us know. We hope to celebrate with you another time.</p>
            </>
          )}
          {email && <p className="done-email">A confirmation will be sent to <strong>{email}</strong>.</p>}
          <div className="done-details">
            <span>March 7, 2027</span><span>·</span><span>Memphis, Tennessee</span>
          </div>
          <button className="btn" onClick={() => setDone(false)}>Edit My Response</button>
        </div>
      ) : (
        <div className="rsvp-step">
          <span className="section-label">Respond for Each Guest</span>
          <h2>Who will be joining us?</h2>
          <p className="rsvp-intro">Please respond for everyone listed below. Each person may choose their own meal.</p>

          {guests.map((g) => (
            <div className="guest-card" key={g.id}>
              <div className="guest-card-name">{g.full_name}</div>

              <div className="guest-attendance">
                <button
                  className={`attend-pill ${g.rsvp_status === 'attending' ? 'on' : ''}`}
                  onClick={() => setAttendance(g.id, 'attending')}
                  type="button"
                >
                  Attending
                </button>
                <button
                  className={`attend-pill decline ${g.rsvp_status === 'declined' ? 'on' : ''}`}
                  onClick={() => setAttendance(g.id, 'declined')}
                  type="button"
                >
                  Cannot Attend
                </button>
              </div>

              {g.rsvp_status === 'attending' && (
                <div className="guest-meal">
                  <span className="guest-meal-label">Meal preference</span>
                  <div className="meal-choices">
                    {MEALS.map((meal) => (
                      <button
                        key={meal}
                        type="button"
                        className={`meal-btn ${g.meal_choice === meal ? 'selected' : ''}`}
                        onClick={() => updateGuest(g.id, { meal_choice: meal })}
                      >
                        {meal}
                      </button>
                    ))}
                  </div>
                  <input
                    className="form-input guest-dietary"
                    type="text"
                    placeholder="Dietary notes (optional)"
                    value={g.dietary_notes || ''}
                    onChange={(e) => updateGuest(g.id, { dietary_notes: e.target.value })}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="form-group household-email">
            <label className="form-label" htmlFor="email">Contact email (for day-of updates)</label>
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

          {!canSubmit && (
            <p className="meal-hint">
              {!allAnswered
                ? 'Please choose attending or cannot attend for each guest.'
                : 'Please select a meal for each attending guest.'}
            </p>
          )}

          <button
            className="btn btn-filled rsvp-submit"
            type="button"
            onClick={submitAll}
            disabled={saving || !canSubmit}
          >
            {saving ? 'Saving...' : 'Submit RSVP for Household'}
          </button>
        </div>
      )}
    </div>
  );
}
