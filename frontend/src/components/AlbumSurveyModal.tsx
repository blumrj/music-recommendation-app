/**
 * ALBUM SURVEY MODAL
 * 
 * Asks users 5 questions about an album they're saving
 * Collects emotional context data for recommendations
 * 
 * Flow:
 * 1. Modal appears when user saves album
 * 2. User answers 5 preset questions
 * 3. Optional free-text note
 * 4. "Save Survey" submits, closes modal
 * 5. "Skip" closes without saving
 * 6. After 10+ surveys, show "Analyze Your Taste" CTA
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import '../styles/AlbumSurveyModal.css';

interface AlbumSurveyModalProps {
  album: {
    spotifyId: string;
    name: string;
    artist: string;
    imageUrl: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSurveyComplete?: () => void;
  onSkipAlbum?: () => void;
}

export const AlbumSurveyModal: React.FC<AlbumSurveyModalProps> = ({
  album,
  isOpen,
  onClose,
  onSurveyComplete,
  onSkipAlbum
}) => {
  const [step, setStep] = useState(0); // 0-5: which question
  const [loading, setLoading] = useState(false);
  
  // Responses
  const [seasons, setSeasons] = useState<string[]>([]);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [whenYouListen, setWhenYouListen] = useState<string[]>([]);
  const [movementPreference, setMovementPreference] = useState<string>('');
  const [vibe, setVibe] = useState<string[]>([]);
  const [optionalNote, setOptionalNote] = useState('');

  // Reset all survey state when album changes
  useEffect(() => {
    setStep(0);
    setSeasons([]);
    setEmotions([]);
    setWhenYouListen([]);
    setMovementPreference('');
    setVibe([]);
    setOptionalNote('');
  }, [album.spotifyId]);

  if (!isOpen) return null;

  const seasonOptions = [
    { label: 'Spring (renewal, awakening)', value: 'spring' },
    { label: 'Summer (energy, freedom)', value: 'summer' },
    { label: 'Autumn (reflection, chng)', value: 'autumn' },
    { label: 'Winter (introspection, cold)', value: 'winter' }
  ];

  const emotionOptions = [
    'Peaceful / Calm',
   'Melancholic / Sad (in good way)',
    'Hopeful / Uplifting',
    'Introspective / Thoughtful',
    'Energetic / Alive',
    'Nostalgic / Memories',
    'Freedom / Liberation',
    'Healing / Cathartic',
    'Cozy / Comforting',
    'Mysterious / Dreamy',
    'Angry / Frustrated',
    'Aggressive / Intense',
    'Defiant / Rebellious',
    'Spiritual / Connected',
    'Sacred / Divine',
    'Meditative / Transcendent'
  ];

  const whenOptions = [
    'While walking/moving',
    'While studying/working',
    'Before bed',
    'First thing in morning',
    'During bad weather (rain, snow)',
    'When I\'m alone',
    'When I need to think/process',
    'Just for the vibes'
  ];

  const movementOptions = [
    { label: 'Slow down / Be still', value: 'slow' },
    { label: 'Walk / Wander / Explore', value: 'walk' },
    { label: 'Dance / Move / Feel alive', value: 'dance' },
    { label: 'Reflect / Think deeply', value: 'reflect' },
    { label: 'Dream / Escape', value: 'dream' },
    { label: 'Relax / Let go', value: 'relax' }
  ];

  const vibeOptions = [
    'Nature (trees, forests, earth)',
    'Earthy / Sensory (smell, texture)',
    'Urban / City',
    'Nostalgic / Vintage',
    'Dark / Moody',
    'Bright / Light',
    'Intimate / Close',
    'Expansive / Wide open',
    'Water / Rain / Storms'
  ];

  const toggleOption = (val: string, arr: string[], setArr: (a: string[]) => void) => {
    if (arr.includes(val)) {
      setArr(arr.filter(v => v !== val));
    } else {
      setArr([...arr, val]);
    }
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const response = await apiClient.saveSurvey(album.spotifyId, {
        albumName: album.name,
        artist: album.artist,
        imageUrl: album.imageUrl,
        seasons,
        emotions,
        whenYouListen,
        movementPreference,
        vibe,
        optionalNote: optionalNote || undefined
      });

      console.log('✅ Survey saved:', response);

      // Check if ready for analysis
      if (response.readyForAnalysis) {
        alert(`🎉 You've completed ${response.totalSurveys} surveys! Ready to analyze your taste?`);
      }

      onSurveyComplete?.();
      onClose();
    } catch (error) {
      console.error('❌ Error saving survey:', error);
      alert('Failed to save survey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return seasons.length > 0;
    if (step === 1) return emotions.length > 0;
    if (step === 2) return whenYouListen.length > 0;
    if (step === 3) return movementPreference !== '';
    if (step === 4) return vibe.length > 0;
    if (step === 5) return true; // Optional note
    return false;
  };

  const progressPercent = ((step + 1) / 6) * 100;

  return (
    <div className="survey-modal-overlay" onClick={onClose}>
      <div className="survey-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="survey-header">
          <img src={album.imageUrl} alt={album.name} className="survey-album-art" />
          <div className="survey-album-info">
            <h3>{album.name}</h3>
            <p>{album.artist}</p>
          </div>
          <button className="survey-close" onClick={onClose}>✕</button>
        </div>

        {/* Progress bar */}
        <div className="survey-progress">
          <div className="survey-progress-bar" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Question content */}
        <div className="survey-content">
          {/* Q1: Seasons */}
          {step === 0 && (
            <div className="survey-question">
              <h4>Which seasons fit this album?</h4>
              <div className="survey-options">
                {seasonOptions.map((opt) => (
                  <label key={opt.value} className="survey-checkbox">
                    <input
                      type="checkbox"
                      checked={seasons.includes(opt.value)}
                      onChange={() => toggleOption(opt.value, seasons, setSeasons)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Q2: Emotions */}
          {step === 1 && (
            <div className="survey-question">
              <h4>What emotions does it bring up?</h4>
              <div className="survey-options">
                {emotionOptions.map((opt) => (
                  <label key={opt} className="survey-checkbox">
                    <input
                      type="checkbox"
                      checked={emotions.includes(opt)}
                      onChange={() => toggleOption(opt, emotions, setEmotions)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Q3: When you listen */}
          {step === 2 && (
            <div className="survey-question">
              <h4>When do you typically listen?</h4>
              <div className="survey-options">
                {whenOptions.map((opt) => (
                  <label key={opt} className="survey-checkbox">
                    <input
                      type="checkbox"
                      checked={whenYouListen.includes(opt)}
                      onChange={() => toggleOption(opt, whenYouListen, setWhenYouListen)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Q4: Movement */}
          {step === 3 && (
            <div className="survey-question">
              <h4>What does it make you want to do?</h4>
              <div className="survey-options">
                {movementOptions.map((opt) => (
                  <label key={opt.value} className="survey-radio">
                    <input
                      type="radio"
                      value={opt.value}
                      checked={movementPreference === opt.value}
                      onChange={(e) => setMovementPreference(e.target.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Q5: Vibe */}
          {step === 4 && (
            <div className="survey-question">
              <h4>Vibe / Imagery?</h4>
              <div className="survey-options">
                {vibeOptions.map((opt) => (
                  <label key={opt} className="survey-checkbox">
                    <input
                      type="checkbox"
                      checked={vibe.includes(opt)}
                      onChange={() => toggleOption(opt, vibe, setVibe)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Q6: Optional note */}
          {step === 5 && (
            <div className="survey-question">
              <h4>Anything else? (optional)</h4>
              <textarea
                placeholder="Why is this album special to you? (1-2 sentences)"
                value={optionalNote}
                onChange={(e) => setOptionalNote(e.target.value)}
                className="survey-textarea"
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="survey-buttons">
          <button
            onClick={onClose}
            className="survey-btn survey-btn-secondary"
            disabled={loading}
          >
            Close
          </button>

          {step > 0 && (
            <button
              onClick={handleBack}
              className="survey-btn survey-btn-secondary"
              disabled={loading}
            >
              Back
            </button>
          )}

          {step < 5 && (
            <button
              onClick={handleNext}
              className="survey-btn survey-btn-primary"
              disabled={loading || !canProceed()}
            >
              Next
            </button>
          )}

          {step === 5 && (
            <button
              onClick={handleSubmit}
              className="survey-btn survey-btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Survey'}
            </button>
          )}
        </div>

        {/* Skip Album Button (when in wizard) */}
        {onSkipAlbum && (
          <div className="survey-skip-album" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
            <button
              onClick={onSkipAlbum}
              className="survey-btn survey-btn-secondary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              ⊘ Skip This Album
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
