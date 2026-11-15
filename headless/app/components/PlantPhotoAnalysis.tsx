import {useEffect, useRef, useState} from 'react';
import type {ChangeEvent, FormEvent} from 'react';
import {Link, useSearchParams} from 'react-router';
import {preparePlantPhoto, type PlantPhotoReport} from '~/lib/plant-photo';

type Result = {report: PlantPhotoReport; requestId: string};
export function PlantPhotoAnalysis() {
  const [params] = useSearchParams();
  const en = params.get('lang') === 'en';
  const t = (de: string, english: string) => (en ? english : de);
  const [images, setImages] = useState<string[]>([]);
  const [mode, setMode] = useState('identify');
  const [context, setContext] = useState('');
  const [consent, setConsent] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const confidence = (value: string) =>
    ({
      low: t('unsicher', 'uncertain'),
      medium: t('plausibel', 'plausible'),
      high: t('deutliche Bildhinweise', 'strong visual evidence'),
    })[value];
  const errors: Record<string, string> = {
    invalid_image: t(
      'Bitte ein lesbares JPEG-, PNG- oder WebP-Foto wählen.',
      'Choose a readable JPEG, PNG or WebP photo.',
    ),
    file_too_large: t(
      'Maximal 8 MB pro Originalfoto. Bitte ein kleineres Foto wählen.',
      'Maximum 8 MB per original photo. Choose a smaller image.',
    ),
    image_dimensions: t(
      'Bitte ein Foto ab 128 × 128 Pixeln und unter 40 Megapixeln wählen.',
      'Choose an image at least 128 × 128 pixels and below 40 megapixels.',
    ),
    authentication_required: t(
      'Deine Sitzung ist abgelaufen. Bitte erneut anmelden.',
      'Your session expired. Please sign in again.',
    ),
    rate_limited: t(
      'Das Analyselimit ist erreicht. Bitte in zehn Minuten erneut versuchen.',
      'The analysis limit was reached. Please try again in ten minutes.',
    ),
    analysis_timeout: t(
      'Die Analyse dauert zu lange. Bitte erneut versuchen.',
      'The analysis timed out. Please try again.',
    ),
    unavailable: t(
      'Die Analyse ist gerade nicht verfügbar. Bitte später erneut versuchen.',
      'Analysis is currently unavailable. Please try again later.',
    ),
  };
  async function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (!files.length) return;
    setResult(null);
    setError('');
    if (files.length + images.length > 3) {
      setError(
        t('Bis zu drei Fotos pro Analyse.', 'Up to three photos per analysis.'),
      );
      return;
    }
    setPreparing(true);
    try {
      const prepared: string[] = [];
      for (const file of files) prepared.push(await preparePlantPhoto(file));
      setImages((current) => [...current, ...prepared]);
      setConsent(false);
    } catch (err) {
      setError(
        errors[err instanceof Error ? err.message : 'unavailable'] ||
          errors.unavailable,
      );
    } finally {
      setPreparing(false);
    }
  }
  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!images.length || !consent || busy || preparing) return;
    const active = new AbortController();
    controller.current = active;
    const timer = setTimeout(() => active.abort('timeout'), 55_000);
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/plant-analysis', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          images,
          mode,
          context,
          consent,
          locale: en ? 'en' : 'de',
        }),
        signal: active.signal,
      });
      const payload = (await response.json()) as Result & {error?: string};
      if (!response.ok) throw new Error(payload.error || 'unavailable');
      if (!payload.report) throw new Error('unavailable');
      setResult(payload);
    } catch (err) {
      if (active.signal.aborted) {
        if (active.signal.reason === 'timeout')
          setError(errors.analysis_timeout);
      } else
        setError(
          errors[err instanceof Error ? err.message : 'unavailable'] ||
            errors.unavailable,
        );
    } finally {
      clearTimeout(timer);
      setBusy(false);
      controller.current = null;
    }
  }
  return (
    <section className="plant-photo" lang={en ? 'en' : 'de'}>
      <header className="plant-photo__intro">
        <p className="plant-photo__eyebrow">
          LEAF · {t('Pflanzen verstehen', 'Understand your plants')}
        </p>
        <h1>{t('Was zeigt deine Pflanze?', 'What is your plant showing?')}</h1>
        <p>
          {t(
            'Pflanze erkennen oder sichtbare Probleme eingrenzen – mit Fotos, Bildhinweisen und nächsten Prüfschritten.',
            'Identify a plant or explore visible problems with photos, visual evidence and practical next checks.',
          )}
        </p>
        <Link to={`/portal${en ? '?lang=en' : ''}`}>
          {t('Zurück zum Portal', 'Back to your portal')}
        </Link>
      </header>
      <div className="plant-photo__layout">
        <form
          className="plant-photo__card"
          onSubmit={(event) => {
            void analyze(event);
          }}
        >
          <fieldset disabled={busy || preparing}>
            <legend>
              {t(
                '1 · Wobei brauchst du Hilfe?',
                '1 · What would you like to know?',
              )}
            </legend>
            <label htmlFor="photo-mode">
              {t('Analyseziel', 'Analysis goal')}
            </label>
            <select
              id="photo-mode"
              value={mode}
              onChange={(event) => {
                setMode(event.target.value);
                setResult(null);
              }}
            >
              <option value="identify">
                {t('Pflanze erkennen', 'Identify a plant')}
              </option>
              <option value="problem">
                {t('Problem prüfen', 'Explore a problem')}
              </option>
            </select>
            <label htmlFor="plant-photos">
              {t('2 · Fotos auswählen', '2 · Choose photos')}
            </label>
            <p id="plant-photo-help">
              {t(
                'Bis zu drei Fotos: ganze Pflanze, betroffenes Blatt und Blattunterseite. Tageslicht, scharf und ohne Filter. JPEG, PNG oder WebP, je bis 8 MB.',
                'Up to three photos: whole plant, affected leaf and leaf underside. Use daylight, sharp focus and no filters. JPEG, PNG or WebP, up to 8 MB each.',
              )}
            </p>
            <input
              id="plant-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={images.length >= 3}
              aria-describedby="plant-photo-help"
              onChange={(event) => {
                void selectPhotos(event);
              }}
            />
            <label htmlFor="plant-camera">
              {t(
                'Oder Foto mit der Kamera aufnehmen',
                'Or take a photo with your camera',
              )}
            </label>
            <input
              id="plant-camera"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              disabled={images.length >= 3}
              onChange={(event) => {
                void selectPhotos(event);
              }}
            />
            <div className="plant-photo__previews">
              {images.map((image, index) => (
                <figure key={image}>
                  <img
                    src={image}
                    width={240}
                    height={180}
                    alt={`${t('Ausgewähltes Pflanzenfoto', 'Selected plant photo')} ${index + 1}`}
                  />
                  <figcaption>
                    <button
                      type="button"
                      onClick={() => {
                        setImages((current) =>
                          current.filter((_, i) => i !== index),
                        );
                        setResult(null);
                        setConsent(false);
                      }}
                    >
                      {t('Foto entfernen', 'Remove photo')} {index + 1}
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
            <label htmlFor="plant-context">
              {t(
                '3 · Was ist dir aufgefallen? (optional)',
                '3 · What have you noticed? (optional)',
              )}
            </label>
            <textarea
              id="plant-context"
              rows={4}
              maxLength={1600}
              value={context}
              placeholder={t(
                'Seit wann? Standort und Licht? Gießen, Substrat und letzte Veränderungen?',
                'When did it start? Location and light? Watering, substrate and recent changes?',
              )}
              onChange={(event) => {
                setContext(event.target.value);
                setResult(null);
              }}
            />
            <label className="plant-photo__consent">
              <input
                type="checkbox"
                checked={consent}
                required
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                {t(
                  'Ich möchte die ausgewählten Fotos und Angaben zur KI-Analyse an OpenAI senden. Keine Personen, Adressen oder vertraulichen Inhalte hochladen.',
                  'I want to send the selected photos and details to OpenAI for AI analysis. Do not upload people, addresses or confidential content.',
                )}
              </span>
            </label>
            <p className="plant-photo__privacy">
              {t(
                'Die Fotos werden vor dem Versand verkleinert und neu kodiert; EXIF-/GPS-Metadaten werden dabei entfernt. Wir legen kein Fotoarchiv an. Verarbeitung und mögliche Sicherheitsaufbewahrung beim KI-Anbieter richten sich nach dessen Bedingungen.',
                'Photos are resized and re-encoded before upload, removing EXIF/GPS metadata. We do not create a photo archive. Provider processing and possible safety retention follow the AI provider’s terms.',
              )}
            </p>
            <button
              className="plant-photo__primary"
              type="submit"
              disabled={!images.length || !consent}
            >
              {t('Fotos analysieren', 'Analyze photos')}
            </button>
          </fieldset>
          {busy ? (
            <button type="button" onClick={() => controller.current?.abort()}>
              {t('Abbrechen', 'Cancel')}
            </button>
          ) : null}
          <p role="status" aria-live="polite">
            {busy
              ? t('Deine Fotos werden analysiert …', 'Analyzing your photos …')
              : preparing
                ? t('Fotos werden vorbereitet …', 'Preparing photos …')
                : ''}
          </p>
          {error ? (
            <p role="alert">
              {error}{' '}
              <Link to="/auth/login">{t('Zur Anmeldung', 'Sign in')}</Link>
            </p>
          ) : null}
        </form>
        <div className="plant-photo__card plant-photo__report" aria-busy={busy}>
          {result ? (
            <>
              <h2>{t('Deine Einschätzung', 'Your assessment')}</h2>
              <p className="plant-photo__quality">
                {t('Bildgrundlage', 'Image evidence')}:{' '}
                {
                  {
                    sufficient: t('ausreichend', 'sufficient'),
                    limited: t('eingeschränkt', 'limited'),
                    unusable: t('nicht auswertbar', 'unusable'),
                    not_plant: t('keine Pflanze erkennbar', 'no plant visible'),
                  }[result.report.quality]
                }
              </p>
              <p>{result.report.summary}</p>
              {result.report.identification.length ? (
                <>
                  <h3>{t('Mögliche Pflanzen', 'Possible plants')}</h3>
                  {result.report.identification.map((plant, i) => (
                    <article key={i}>
                      <h4>
                        {plant.commonName} · <i>{plant.scientificName}</i>
                      </h4>
                      <p>
                        {t('Modell-Einschätzung', 'Model assessment')}:{' '}
                        {confidence(plant.confidence)}
                      </p>
                      <p>{plant.evidence}</p>
                    </article>
                  ))}
                </>
              ) : null}
              {result.report.observations.length ? (
                <>
                  <h3>
                    {t('Sichtbare Beobachtungen', 'Visible observations')}
                  </h3>
                  <ul>
                    {result.report.observations.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {result.report.possibleCauses.length ? (
                <>
                  <h3>
                    {t(
                      'Mögliche Ursachen – noch nicht bestätigt',
                      'Possible causes – not yet confirmed',
                    )}
                  </h3>
                  {result.report.possibleCauses.map((cause, i) => (
                    <article key={i}>
                      <h4>
                        {i + 1}. {cause.cause}
                      </h4>
                      <p>
                        {confidence(cause.confidence)} · {cause.evidence}
                      </p>
                      <p>
                        <strong>
                          {t('Als Nächstes prüfen', 'Next check')}:
                        </strong>{' '}
                        {cause.nextCheck}
                      </p>
                    </article>
                  ))}
                </>
              ) : null}
              {result.report.nextSteps.length ? (
                <>
                  <h3>{t('Deine nächsten Schritte', 'Your next steps')}</h3>
                  <ol>
                    {result.report.nextSteps.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                </>
              ) : null}
              {result.report.followUpQuestions.length ? (
                <>
                  <h3>
                    {t(
                      'Das würde die Einschätzung verbessern',
                      'What would improve the assessment',
                    )}
                  </h3>
                  <ul>
                    {result.report.followUpQuestions.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {result.report.limitations.length ? (
                <>
                  <h3>
                    {t('Grenzen dieser Einschätzung', 'Assessment limitations')}
                  </h3>
                  <ul>
                    {result.report.limitations.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              <p className="plant-photo__privacy">
                {t(
                  'KI-Einschätzung, keine gesicherte Diagnose. Plausibilität ist keine gemessene Trefferwahrscheinlichkeit.',
                  'AI assessment, not a confirmed diagnosis. Plausibility is not a measured accuracy probability.',
                )}
              </p>
              <p className="plant-photo__privacy">
                {t('Vorgangsnummer', 'Reference')}: {result.requestId}
              </p>
              <button
                type="button"
                onClick={() => {
                  setImages([]);
                  setContext('');
                  setConsent(false);
                  setResult(null);
                }}
              >
                {t('Fotos und Ergebnis verwerfen', 'Discard photos and result')}
              </button>
            </>
          ) : (
            <>
              <h2>
                {t(
                  'Erst beobachten, dann handeln.',
                  'Observe first, then act.',
                )}
              </h2>
              <p>
                {t(
                  'Deine Analyse trennt sichtbare Merkmale von möglichen Erklärungen. Bei unklaren Bildern fragen wir nach besseren Ansichten, statt eine sichere Diagnose zu behaupten.',
                  'Your analysis separates visible features from possible explanations. Unclear images prompt requests for better views rather than a claimed diagnosis.',
                )}
              </p>
              <ol>
                <li>
                  {t(
                    'Pflanzenmerkmale und mögliche Zuordnung',
                    'Plant features and possible identification',
                  )}
                </li>
                <li>
                  {t(
                    'Beobachtungen und begründete Ursachen',
                    'Observations and evidence for possible causes',
                  )}
                </li>
                <li>
                  {t('Schonende nächste Schritte', 'Low-risk next steps')}
                </li>
              </ol>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
