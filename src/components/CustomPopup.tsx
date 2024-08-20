import React from 'react';
import styles from './CustomPopup.module.css';

interface CustomPopupProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

const CustomPopup: React.FC<CustomPopupProps> = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <div className={styles.content} dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
};

export default CustomPopup;