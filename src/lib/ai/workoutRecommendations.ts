// AI-powered workout recommendations for MomFit
import { supabase } from '../supabase';

export interface WorkoutRecommendation {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  exercises: Exercise[];
  tags: string[];
  postpartum_safe: boolean;
  trimester_safe?: number[]; // for pregnant users
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  duration?: number; // in seconds
  rest?: number; // in seconds
  instructions: string;
  modifications?: string[];
}

export interface UserPreferences {
  fitness_goals: string[];
  available_time: number;
  equipment_available: string[];
  fitness_level: 'beginner' | 'intermediate' | 'advanced';
  postpartum_weeks?: number;
  is_pregnant?: boolean;
  trimester?: number;
  physical_limitations?: string[];
}

class WorkoutRecommendationEngine {
  private workoutDatabase: WorkoutRecommendation[] = [
    {
      id: 'postpartum-gentle-start',
      title: 'Gentle Postpartum Recovery',
      description: 'A safe, gentle workout to help new moms start their fitness journey',
      duration: 15,
      difficulty: 'beginner',
      equipment: [],
      postpartum_safe: true,
      tags: ['postpartum', 'recovery', 'gentle', 'core'],
      exercises: [
        {
          name: 'Deep Breathing',
          duration: 120,
          instructions: 'Lie on your back, breathe deeply into your belly',
          modifications: ['Can be done sitting if lying down is uncomfortable']
        },
        {
          name: 'Pelvic Tilts',
          sets: 2,
          reps: 10,
          instructions: 'Gently tilt pelvis forward and back',
          modifications: ['Start with smaller movements']
        },
        {
          name: 'Modified Cat-Cow',
          sets: 2,
          reps: 8,
          instructions: 'On hands and knees, gently arch and round your back',
          modifications: ['Can be done sitting in a chair']
        }
      ]
    },
    {
      id: 'busy-mom-hiit',
      title: '15-Minute Busy Mom HIIT',
      description: 'High-intensity workout perfect for busy schedules',
      duration: 15,
      difficulty: 'intermediate',
      equipment: [],
      postpartum_safe: true,
      tags: ['hiit', 'quick', 'cardio', 'strength'],
      exercises: [
        {
          name: 'Jumping Jacks',
          duration: 30,
          rest: 10,
          instructions: 'Classic jumping jacks for cardio',
          modifications: ['Step side to side instead of jumping']
        },
        {
          name: 'Bodyweight Squats',
          duration: 30,
          rest: 10,
          instructions: 'Squat down keeping chest up',
          modifications: ['Use a chair for support']
        },
        {
          name: 'Push-ups',
          duration: 30,
          rest: 10,
          instructions: 'Standard push-ups',
          modifications: ['Wall push-ups', 'Knee push-ups']
        }
      ]
    },
    {
      id: 'prenatal-safe',
      title: 'Prenatal Strength & Mobility',
      description: 'Safe exercises for expecting mothers',
      duration: 20,
      difficulty: 'beginner',
      equipment: ['resistance_band'],
      postpartum_safe: false,
      trimester_safe: [1, 2, 3],
      tags: ['prenatal', 'strength', 'mobility', 'safe'],
      exercises: [
        {
          name: 'Prenatal Squats',
          sets: 3,
          reps: 12,
          instructions: 'Wide-stance squats with support',
          modifications: ['Use wall for support', 'Reduce depth as needed']
        },
        {
          name: 'Side-lying Leg Lifts',
          sets: 2,
          reps: 10,
          instructions: 'Lie on side, lift top leg slowly',
          modifications: ['Support head with pillow']
        }
      ]
    },
    {
      id: 'strength-building',
      title: 'Mom Strength Builder',
      description: 'Build functional strength for daily mom activities',
      duration: 30,
      difficulty: 'intermediate',
      equipment: ['dumbbells'],
      postpartum_safe: true,
      tags: ['strength', 'functional', 'dumbbells'],
      exercises: [
        {
          name: 'Goblet Squats',
          sets: 3,
          reps: 12,
          instructions: 'Hold weight at chest, squat down',
          modifications: ['Use lighter weight or no weight']
        },
        {
          name: 'Bent-over Rows',
          sets: 3,
          reps: 10,
          instructions: 'Hinge at hips, pull weights to chest',
          modifications: ['Use resistance band instead']
        }
      ]
    }
  ];

  public async getRecommendations(
    userId: string, 
    preferences: UserPreferences
  ): Promise<WorkoutRecommendation[]> {
    // Filter workouts based on user preferences
    let suitableWorkouts = this.workoutDatabase.filter(workout => {
      // Check postpartum safety
      if (preferences.postpartum_weeks !== undefined) {
        if (!workout.postpartum_safe) return false;
        if (preferences.postpartum_weeks < 6 && workout.difficulty !== 'beginner') {
          return false;
        }
      }

      // Check pregnancy safety
      if (preferences.is_pregnant && preferences.trimester) {
        if (!workout.trimester_safe?.includes(preferences.trimester)) {
          return false;
        }
      }

      // Check duration
      if (workout.duration > preferences.available_time) {
        return false;
      }

      // Check equipment availability
      const hasRequiredEquipment = workout.equipment.every(equipment => 
        preferences.equipment_available.includes(equipment) || equipment === ''
      );
      if (!hasRequiredEquipment) return false;

      // Check difficulty level
      const difficultyLevels = ['beginner', 'intermediate', 'advanced'];
      const userLevel = difficultyLevels.indexOf(preferences.fitness_level);
      const workoutLevel = difficultyLevels.indexOf(workout.difficulty);
      
      // Allow workouts at user's level or one level below
      if (workoutLevel > userLevel + 1) return false;

      return true;
    });

    // Score workouts based on user goals
    const scoredWorkouts = suitableWorkouts.map(workout => ({
      ...workout,
      score: this.calculateWorkoutScore(workout, preferences)
    }));

    // Sort by score and return top recommendations
    return scoredWorkouts
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private calculateWorkoutScore(
    workout: WorkoutRecommendation, 
    preferences: UserPreferences
  ): number {
    let score = 0;

    // Goal matching
    preferences.fitness_goals.forEach(goal => {
      if (workout.tags.some(tag => 
        tag.toLowerCase().includes(goal.toLowerCase()) ||
        goal.toLowerCase().includes(tag.toLowerCase())
      )) {
        score += 10;
      }
    });

    // Time preference bonus
    if (Math.abs(workout.duration - preferences.available_time) <= 5) {
      score += 5;
    }

    // Difficulty matching
    if (workout.difficulty === preferences.fitness_level) {
      score += 8;
    }

    // Postpartum specific bonus
    if (preferences.postpartum_weeks !== undefined && workout.postpartum_safe) {
      score += 15;
    }

    // Equipment bonus (no equipment needed)
    if (workout.equipment.length === 0) {
      score += 3;
    }

    return score;
  }

  public async generatePersonalizedWorkout(
    userId: string,
    preferences: UserPreferences,
    focusArea?: string
  ): Promise<WorkoutRecommendation> {
    // Get user's workout history to avoid repetition
    const recentWorkouts = await this.getUserRecentWorkouts(userId);
    
    // Create a custom workout based on preferences
    const customWorkout: WorkoutRecommendation = {
      id: `custom-${Date.now()}`,
      title: `Your Personalized ${focusArea || 'Full Body'} Workout`,
      description: 'A workout tailored specifically to your goals and preferences',
      duration: preferences.available_time,
      difficulty: preferences.fitness_level,
      equipment: preferences.equipment_available,
      postpartum_safe: preferences.postpartum_weeks !== undefined,
      tags: preferences.fitness_goals,
      exercises: []
    };

    // Select exercises based on focus area and preferences
    customWorkout.exercises = this.selectExercises(preferences, focusArea, recentWorkouts);

    return customWorkout;
  }

  private async getUserRecentWorkouts(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_workouts')
        .select('workout_id')
        .eq('user_id', userId)
        .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data?.map(w => w.workout_id) || [];
    } catch (error) {
      console.error('Error fetching recent workouts:', error);
      return [];
    }
  }

  private selectExercises(
    preferences: UserPreferences,
    focusArea?: string,
    recentWorkouts: string[] = []
  ): Exercise[] {
    const exercisePool = this.getExercisePool(preferences, focusArea);
    const selectedExercises: Exercise[] = [];
    const targetDuration = preferences.available_time;
    let currentDuration = 0;

    // Warm-up (always include)
    selectedExercises.push({
      name: 'Warm-up',
      duration: 300, // 5 minutes
      instructions: 'Light movement to prepare your body',
      modifications: ['Marching in place', 'Arm circles', 'Gentle stretching']
    });
    currentDuration += 5;

    // Main exercises
    while (currentDuration < targetDuration - 5 && exercisePool.length > 0) {
      const randomIndex = Math.floor(Math.random() * exercisePool.length);
      const exercise = exercisePool.splice(randomIndex, 1)[0];
      
      const exerciseDuration = this.estimateExerciseDuration(exercise);
      if (currentDuration + exerciseDuration <= targetDuration - 5) {
        selectedExercises.push(exercise);
        currentDuration += exerciseDuration;
      }
    }

    // Cool-down (always include)
    selectedExercises.push({
      name: 'Cool-down Stretch',
      duration: 300, // 5 minutes
      instructions: 'Gentle stretching to help recovery',
      modifications: ['Hold each stretch for 30 seconds', 'Focus on areas worked']
    });

    return selectedExercises;
  }

  private getExercisePool(preferences: UserPreferences, focusArea?: string): Exercise[] {
    // This would be a comprehensive database of exercises
    // For now, returning a sample based on common exercises
    const allExercises = this.workoutDatabase.flatMap(w => w.exercises);
    
    // Filter based on equipment and safety
    return allExercises.filter(exercise => {
      // Add filtering logic based on preferences
      return true; // Simplified for now
    });
  }

  private estimateExerciseDuration(exercise: Exercise): number {
    if (exercise.duration) return exercise.duration / 60; // Convert to minutes
    if (exercise.sets && exercise.reps) {
      // Estimate: 2 seconds per rep + rest time
      const workTime = (exercise.sets * exercise.reps * 2) / 60;
      const restTime = exercise.sets * (exercise.rest || 30) / 60;
      return workTime + restTime;
    }
    return 3; // Default 3 minutes
  }

  public async saveWorkoutCompletion(
    userId: string,
    workoutId: string,
    completedExercises: string[],
    duration: number,
    difficulty_rating: number
  ): Promise<void> {
    try {
      await supabase
        .from('user_workouts')
        .insert({
          user_id: userId,
          workout_id: workoutId,
          completed_exercises: completedExercises,
          duration_minutes: duration,
          difficulty_rating,
          completed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving workout completion:', error);
    }
  }
}

export const workoutRecommendationEngine = new WorkoutRecommendationEngine();