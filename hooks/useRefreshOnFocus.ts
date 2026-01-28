import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export function useRefreshOnFocus(refetch: () => void) {
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );
}

export default useRefreshOnFocus;
