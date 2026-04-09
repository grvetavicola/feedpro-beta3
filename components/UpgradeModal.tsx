import React from 'react';
import { useTranslations } from '../lib/i18n/LangContext';
import { StarIcon, SparklesIcon } from './icons';

interface UpgradeModalProps {
  onClose: () => void;
  onUpgrade: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose, onUpgrade }) => {
  const { t } = useTranslations();

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-gray-800 border border-yellow-500/50 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 hover:scale-100">
        <div className="p-6 text-center">
          <div className="flex justify-center items-center mb-4">
            <StarIcon className="w-10 h-10 text-yellow-400" />
            <h2 className="text-2xl font-bold text-yellow-300 ml-3">{t('upgrade.title')}</h2>
          </div>
          <p className="text-gray-400 mb-6">{t('upgrade.subtitle')}</p>
          
          <ul className="text-left space-y-3 mb-8">
            <li className="flex items-start">
              <SparklesIcon className="w-5 h-5 text-cyan-400 mr-3 mt-1 flex-shrink-0" />
              <span>
                <strong>{t('upgrade.feature1Title')}</strong> {t('upgrade.feature1Description')}
              </span>
            </li>
             <li className="flex items-start">
              <SparklesIcon className="w-5 h-5 text-cyan-400 mr-3 mt-1 flex-shrink-0" />
              <span>
                <strong>{t('upgrade.feature2Title')}</strong> {t('upgrade.feature2Description')}
              </span>
            </li>
             <li className="flex items-start">
              <SparklesIcon className="w-5 h-5 text-cyan-400 mr-3 mt-1 flex-shrink-0" />
              <span>
                <strong>{t('upgrade.feature3Title')}</strong> {t('upgrade.feature3Description')}
              </span>
            </li>
          </ul>

          <button
            onClick={onUpgrade}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 px-6 rounded-lg text-lg flex items-center justify-center gap-3 transition-transform transform hover:scale-105"
          >
            {t('upgrade.upgradeButton')}
          </button>
           <button
            onClick={onClose}
            className="w-full mt-3 text-gray-400 hover:text-white py-2 px-6 rounded-lg"
          >
            {t('upgrade.laterButton')}
          </button>
        </div>
      </div>
    </div>
  );
};
