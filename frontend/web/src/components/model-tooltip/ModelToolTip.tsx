import React from 'react';
import { OpenRouterModel, ModelCapabilities, formatContextLength, formatPricing } from '@/types/models';
import { IoImage, IoSearch, IoHammer, IoBulb, IoText, IoSparkles } from 'react-icons/io5';
import styles from './ModelToolTip.module.css';

interface ModelTooltipProps {
  model: OpenRouterModel;
  capabilities: ModelCapabilities;
  position: { x: number; y: number };
  visible: boolean;
}

const CapabilityBadge = ({ 
  icon, 
  label, 
  active, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean;
  color: string;
}) => (
  <div className={`${styles.badge} ${active ? styles.badgeActive : styles.badgeInactive}`}>
    <span className={styles.badgeIcon} style={{ color: active ? color : undefined }}>
      {icon}
    </span>
    <span className={styles.badgeLabel}>{label}</span>
  </div>
);

const ModalityChip = ({ modality }: { modality: string }) => {
  const getModalityIcon = (mod: string) => {
    switch (mod.toLowerCase()) {
      case 'text':
        return <IoText size={12} />;
      case 'image':
        return <IoImage size={12} />;
      default:
        return <IoSparkles size={12} />;
    }
  };

  return (
    <div className={styles.modalityChip}>
      {getModalityIcon(modality)}
      <span>{modality}</span>
    </div>
  );
};

export const ModelTooltip: React.FC<ModelTooltipProps> = ({
  model,
  capabilities,
  position,
  visible
}) => {
  if (!visible) return null;

  const tooltipStyle = {
    left: position.x,
    top: position.y,
    transform: 'translateY(-50%)'
  };

  return (
    <div 
      className={styles.tooltip}
      style={tooltipStyle}
    >
      <div className={styles.header}>
        <h3 className={styles.modelName}>{model.name}</h3>
        <div className={styles.contextLength}>
          {formatContextLength(capabilities.contextLength)} tokens
        </div>
      </div>

      {model.description && (
        <p className={styles.description}>
          {model.description.length > 120 
            ? `${model.description.substring(0, 120)}...` 
            : model.description
          }
        </p>
      )}

      <div className={styles.capabilities}>
        <CapabilityBadge
          icon={<IoHammer size={14} />}
          label="Tools"
          active={capabilities.supportsTools}
          color="#10b981"
        />
        <CapabilityBadge
          icon={<IoImage size={14} />}
          label="Vision"
          active={capabilities.supportsVision}
          color="#3b82f6"
        />
        <CapabilityBadge
          icon={<IoSearch size={14} />}
          label="Web Search"
          active={capabilities.supportsWebSearch}
          color="#f59e0b"
        />
        <CapabilityBadge
          icon={<IoBulb size={14} />}
          label="Reasoning"
          active={capabilities.supportsReasoning}
          color="#8b5cf6"
        />
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Input:</span>
          <div className={styles.modalities}>
            {capabilities.inputModalities.map((modality) => (
              <ModalityChip key={modality} modality={modality} />
            ))}
          </div>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Output:</span>
          <div className={styles.modalities}>
            {capabilities.outputModalities.map((modality) => (
              <ModalityChip key={modality} modality={modality} />
            ))}
          </div>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Pricing:</span>
          <div className={styles.pricing}>
            <span>
              {formatPricing(capabilities.pricing.prompt)}/1K prompt •{' '}
              {formatPricing(capabilities.pricing.completion)}/1K completion
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};