import { useState, useEffect, useCallback } from 'react';

const useVBCable = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkVBCable = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      const hasVBCable = audioInputs.some(device => {
        const label = device.label.toLowerCase();
        return label.includes('vb-cable') || 
               label.includes('vb audio') || 
               label.includes('cable input') ||
               label.includes('cable in');
      });
      
      setIsInstalled(hasVBCable);
    } catch (err) {
      console.error('Error checking VB-Cable:', err);
      setIsInstalled(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestAudioPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await checkVBCable();
    } catch (err) {
      console.error('Error requesting audio permission:', err);
    }
  }, [checkVBCable]);

  useEffect(() => {
    checkVBCable();

    const handleDeviceChange = () => {
      checkVBCable();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [checkVBCable]);

  return {
    isInstalled,
    isLoading,
    requestAudioPermission
  };
};

export default useVBCable;
