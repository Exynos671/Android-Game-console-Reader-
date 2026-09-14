import React, { useEffect } from 'react';
import {
  ChevronsRight,
  LayoutPanelTop,
  Undo2,
  Hand,
  Bookmark,
  Palette,
  X,
  Gamepad2,
} from 'lucide-react';
import { ControllerProfile } from '../types';
import { GamepadButtonBadge } from './GamepadButtonBadge';
import { useI18n } from '../i18n';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ControllerProfile;
}

/**
 * First-run (and replayable) button & gesture tutorial. Localized to the
 * active UI language and reflects the user's actual button bindings.
 */
export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  const { t } = useI18n();

  // Start / menu button labels from the real profile mapping.
  const menuInput = profile.bindings.toggleMenu;
  const bInput = profile.bindings.backToLibrary;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const step = (
    icon: React.ReactNode,
    title: string,
    body: React.ReactNode
  ) => (
    <div className="flex gap-3 p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 items-start">
      <div className="shrink-0 p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
        {icon}
      </div>
      <div className="min-w-0 space-y-1">
        <h4 className="text-sm font-bold text-neutral-100">{title}</h4>
        <div className="text-xs text-neutral-400 leading-relaxed">{body}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl overflow-hidden text-neutral-100">
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 border-b border-neutral-800 bg-neutral-950/60"
          style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Gamepad2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">
                  {t('tutorial.title')}
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5 max-w-sm leading-relaxed">
                  {t('tutorial.subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2.5">
          {step(
            <ChevronsRight className="w-4 h-4" />,
            t('tutorial.stepTitleControls'),
            <p>
              {t('tutorial.stepBodyControls')}
              <span className="mt-1.5 flex items-center gap-2 flex-wrap">
                <GamepadButtonBadge inputId={profile.bindings.prevPage} size="sm" />
                <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
              </span>
            </p>
          )}

          {step(
            <LayoutPanelTop className="w-4 h-4" />,
            t('tutorial.stepTitleMenu'),
            <p>
              {t('tutorial.stepBodyMenu')}
              <span className="mt-1.5 flex items-center gap-2 flex-wrap">
                <GamepadButtonBadge inputId={menuInput} size="sm" />
              </span>
            </p>
          )}

          {step(
            <Undo2 className="w-4 h-4" />,
            t('tutorial.stepTitleBack'),
            <p>
              {t('tutorial.stepBodyBack')}
              <span className="mt-1.5 flex items-center gap-2 flex-wrap">
                <GamepadButtonBadge inputId={bInput} size="sm" />
              </span>
            </p>
          )}

          {step(
            <Hand className="w-4 h-4" />,
            t('tutorial.stepTitleTouch'),
            <p>{t('tutorial.stepBodyTouch')}</p>
          )}

          {step(
            <Bookmark className="w-4 h-4" />,
            t('tutorial.stepTitleBookmark'),
            <p>
              {t('tutorial.stepBodyBookmark')}
              <span className="mt-1.5 flex items-center gap-2 flex-wrap">
                <GamepadButtonBadge inputId={profile.bindings.bookmark} size="sm" />
                <GamepadButtonBadge inputId={profile.bindings.toggleToc} size="sm" />
              </span>
            </p>
          )}

          {step(
            <Palette className="w-4 h-4" />,
            t('tutorial.stepTitleTheme'),
            <p>
              {t('tutorial.stepBodyTheme')}
              <span className="mt-1.5 flex items-center gap-2 flex-wrap">
                <GamepadButtonBadge inputId={profile.bindings.toggleDistractionFree} size="sm" />
                <GamepadButtonBadge inputId={profile.bindings.toggleTheme} size="sm" />
              </span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between gap-3"
          style={{
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <p className="text-[10px] text-neutral-500 leading-relaxed flex-1 hidden sm:block">
            {t('tutorial.footer')}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition-colors"
            >
              {t('tutorial.skip')}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all"
            >
              {t('tutorial.gotIt')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
