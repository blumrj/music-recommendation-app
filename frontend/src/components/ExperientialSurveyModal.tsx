/**
 * EXPERIENTIAL SURVEY MODAL
 * 
 * Phase 1: Collects user's emotional perception of an album via 7 sliders
 * Maps directly to 7D emotional space (orthogonal dimensions)
 * 
 * The 7 dimensions directly represent how the user perceives the album:
 * 1. Valence (Positivity) - Sad ← → Happy/Uplifting
 * 2. Arousal (Energy) - Calm ← → Energized/Stimulating
 * 3. Tension - Relaxed ← → Tense/Anxious
 * 4. Warmth - Cold ← → Warm/Inviting
 * 5. Intimacy - Distant ← → Personal/Intimate
 * 6. Density - Sparse ← → Rich/Layered
 * 7. Groundedness - Dreamy ← → Grounded/Real
 * 
 * Flow:
 * 1. Modal appears when user saves album
 * 2. User adjusts 7 sliders (0-100) to describe their perception
 * 3. Labels are primary (users focus on left/right meanings)
 * 4. "Save Survey" submits sliders, closes modal
 * 5. Backend maps 0-100 sliders to 7D emotional space
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import '../styles/ExperientialSurveyModal.css';

interface ExperientialSurveyModalProps {
  album: {
    spotifyId: string;
    name: string;
    artist: string;
    imageUrl: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSurveyComplete?: () => void;
}

interface SliderResponses {
  valence: number;            // 0=Sad, 100=Happy/Uplifting
  arousal: number;            // 0=Calm, 100=Energized
  tension: number;            // 0=Relaxed, 100=Tense
  warmth: number;             // 0=Cold, 100=Warm
  intimacy: number;           // 0=Distant, 100=Personal
  density: number;            // 0=Sparse, 100=Rich/Layered
  groundedness: number;       // 0=Dreamy, 100=Grounded/Real
}

export const ExperientialSurveyModal: React.FC<ExperientialSurveyModalProps> = ({
  album,
  isOpen,
  onClose,
  onSurveyComplete
}) => {
  const [responses, setResponses] = useState<SliderResponses>({
    valence: 50,
    arousal: 50,
    tension: 50,
    warmth: 50,
    intimacy: 50,
    density: 50,
    groundedness: 50
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Reset when album changes
  useEffect(() => {
    setResponses({
      valence: 50,
      arousal: 50,
      tension: 50,
      warmth: 50,
      intimacy: 50,
      density: 50,
      groundedness: 50
    });
    setSubmitted(false);
  }, [album.spotifyId]);

  if (!isOpen) return null;

  const sliders = [
    {
      key: 'valence' as const,
      label: 'Positivity',
      leftLabel: 'Sad',
      rightLabel: 'Happy',
      description: 'Is this album melancholic or uplifting?'
    },
    {
      key: 'arousal' as const,
      label: 'Energy',
      leftLabel: 'Calm',
      rightLabel: 'Energized',
      description: 'How relaxing vs. stimulating does it feel?'
    },
    {
      key: 'tension' as const,
      label: 'Tension',
      leftLabel: 'Relaxed',
      rightLabel: 'Tense',
      description: 'Does this album feel peaceful or anxious?'
    },
    {
      key: 'warmth' as const,
      label: 'Warmth',
      leftLabel: 'Cold',
      rightLabel: 'Warm',
      description: 'How emotionally warm vs. detached does it feel?'
    },
    {
      key: 'intimacy' as const,
      label: 'Intimacy',
      leftLabel: 'Distant',
      rightLabel: 'Personal',
      description: 'How close and personal does this album feel?'
    },
    {
      key: 'density' as const,
      label: 'Density',
      leftLabel: 'Sparse',
      rightLabel: 'Rich',
      description: 'How layered and complex vs. minimal is it?'
    },
    {
      key: 'groundedness' as const,
      label: 'Groundedness',
      leftLabel: 'Dreamy',
      rightLabel: 'Grounded',
      description: 'How ethereal vs. real and concrete does it feel?'
    }
  ];

  const handleSliderChange = (key: keyof SliderResponses, value: number) => {
    setResponses(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Send slider responses to backend (7D dimensions)
      const surveyData: any = {
        albumName: album.name,
        artist: album.artist,
        imageUrl: album.imageUrl,
        // Phase 1: 7D slider responses (0-100)
        valence_response: responses.valence,
        arousal_response: responses.arousal,
        tension_response: responses.tension,
        warmth_response: responses.warmth,
        intimacy_response: responses.intimacy,
        density_response: responses.density,
        groundedness_response: responses.groundedness
      };

      const response = await apiClient.saveSurvey(album.spotifyId, surveyData);

      console.log('✅ Survey saved:', response);

      // Check if ready for analysis
      if (response.readyForAnalysis) {
        alert(`🎉 You've completed ${response.totalSurveys} surveys! Ready to analyze your taste?`);
      }

      setSubmitted(true);
      onSurveyComplete?.();
      onClose();
    } catch (error) {
      console.error('❌ Error saving survey:', error);
      alert('Failed to save survey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="experiential-survey-modal-overlay" onClick={onClose}>
      <div className="experiential-survey-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="experiential-survey-header">
          <img src={album.imageUrl} alt={album.name} className="experiential-survey-album-art" />
          <div className="experiential-survey-album-info">
            <h3>{album.name}</h3>
            <p>{album.artist}</p>
          </div>
          <button className="experiential-survey-close" onClick={onClose}>✕</button>
        </div>

        {/* Title */}
        <div className="experiential-survey-intro">
          <h4>How do you perceive this album?</h4>
          <p>Adjust each slider to describe your emotional experience</p>
        </div>

        {/* Sliders */}
        <div className="experiential-survey-content">
          {sliders.map((slider) => (
            <div key={slider.key} className="experiential-slider-group">
              <div className="experiential-slider-header">
                <label className="experiential-slider-label">{slider.label}</label>
                <p className="experiential-slider-description">{slider.description}</p>
              </div>

              <div className="experiential-slider-container">
                <div className="experiential-slider-labels">
                  <span className="experiential-slider-left">{slider.leftLabel}</span>
                  <span className="experiential-slider-right">{slider.rightLabel}</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={responses[slider.key]}
                  onChange={(e) => handleSliderChange(slider.key, parseInt(e.target.value))}
                  className="experiential-slider-input"
                  disabled={loading}
                />

                <div className="experiential-slider-value">
                  {responses[slider.key]}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="experiential-survey-buttons">
          <button
            onClick={onClose}
            className="experiential-survey-btn experiential-survey-btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="experiential-survey-btn experiential-survey-btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Survey'}
          </button>
        </div>
      </div>
    </div>
  );
};
