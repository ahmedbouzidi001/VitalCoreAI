import { useContext } from 'react';
import { HealthContext, HealthContextType, UserProfile, BiologicalMarker, MealPlanDay, Meal, WorkoutSession, Exercise } from '@/contexts/HealthContext';

export function useHealth(): HealthContextType {
  const context = useContext(HealthContext);
  if (!context) throw new Error('useHealth must be used within HealthProvider');
  return context;
}

export type { UserProfile, BiologicalMarker, MealPlanDay, Meal, WorkoutSession, Exercise };
