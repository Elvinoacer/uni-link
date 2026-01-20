import { useState, useCallback } from 'react';
import { useApi } from './useApi';

export interface University {
  id: string;
  name: string;
  domain?: string;
  logoUrl?: string;
  bannerUrl?: string;
  schoolCount: number;
}

export interface School {
  id: string;
  universityId: string;
  name: string;
  code: string;
  description?: string;
  bannerUrl?: string;
  color?: string;
  iconName?: string;
  orderIndex: number;
  courseCount: number;
  university?: {
    id: string;
    name: string;
  };
}

export interface Course {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  description?: string;
  bannerUrl?: string;
  yearCount: number;
  school?: School;
  yearsOfStudy?: YearOfStudy[];
}

export interface YearOfStudy {
  id: string;
  courseId: string;
  year: number;
  name: string;
  description?: string;
  unitCount: number;
  course?: Course;
  units?: Unit[];
}

export interface Unit {
  id: string;
  yearOfStudyId: string;
  code: string;
  name: string;
  description?: string;
  creditHours?: number;
  professorName?: string;
  orderIndex: number;
  resourceCount: number;
  yearOfStudy?: YearOfStudy;
}

export function useStudyHierarchy() {
  const { get, post } = useApi();
  
  const [universities, setUniversities] = useState<University[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<YearOfStudy[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected items for navigation state
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedYear, setSelectedYear] = useState<YearOfStudy | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Fetch all universities
  const fetchUniversities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await get('/study/universities');
      if (response.success) {
        setUniversities(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Fetch all schools
  const fetchSchools = useCallback(async (universityId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const url = universityId 
        ? `/study/schools?universityId=${universityId}` 
        : '/study/schools';
      const response = await get(url);
      if (response.success) {
        setSchools(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Fetch school details with courses
  const fetchSchool = useCallback(async (schoolId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await get(`/study/schools/${schoolId}`);
      if (response.success) {
        setSelectedSchool(response.data);
        setCourses(response.data.courses || []);
      }
      return response.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Fetch courses for a school
  const fetchCourses = useCallback(async (schoolId?: string, search?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (schoolId) params.append('schoolId', schoolId);
      if (search) params.append('search', search);
      
      const response = await get(`/study/courses?${params.toString()}`);
      if (response.success) {
        setCourses(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Fetch course details with years
  const fetchCourse = useCallback(async (courseId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await get(`/study/courses/${courseId}`);
      if (response.success) {
        setSelectedCourse(response.data);
        setYears(response.data.yearsOfStudy || []);
      }
      return response.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Fetch year details and return directly
  const fetchCourseDetails = useCallback(async (courseId: string): Promise<Course | null> => {
    try {
      const response = await get(`/study/courses/${courseId}`);
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [get]);

  // Fetch years for a course
  const fetchYears = useCallback(async (courseId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await get(`/study/years?courseId=${courseId}`);
      if (response.success) {
        setYears(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Fetch year details with units
  const fetchYear = useCallback(async (yearId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await get(`/study/years/${yearId}`);
      if (response.success) {
        setSelectedYear(response.data);
        setUnits(response.data.units || []);
      }
      return response.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Fetch units for a year
  const fetchUnits = useCallback(async (yearOfStudyId: string, search?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('yearOfStudyId', yearOfStudyId);
      if (search) params.append('search', search);
      
      const response = await get(`/study/units?${params.toString()}`);
      if (response.success) {
        setUnits(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Fetch unit details with resources
  const fetchUnit = useCallback(async (unitId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await get(`/study/units/${unitId}`);
      if (response.success) {
        setSelectedUnit(response.data);
      }
      return response.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Create a new school
  const createSchool = useCallback(async (data: Partial<School> & { universityId: string }) => {
    try {
      const response = await post('/study/schools', data);
      if (response.success) {
        setSchools((prev) => [...prev, response.data]);
        return response.data;
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [post]);

  // Create a course (e.g., Computer Science)
  const createCourse = useCallback(async (data: { schoolId: string; code: string; name: string; description?: string; bannerUrl?: string }) => {
    try {
      const response = await post('/study/courses', data);
      if (response.success) {
        setCourses((prev) => [...prev, response.data]);
        return response.data;
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [post]);

  // Create a year of study
  const createYear = useCallback(async (data: { courseId: string; year: number; name: string; description?: string }) => {
    try {
      const response = await post('/study/years', data);
      if (response.success) {
        setYears((prev) => [...prev, response.data]);
        return response.data;
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [post]);

  // Create a unit (e.g., CSC 311)
  const createUnit = useCallback(async (data: { yearOfStudyId: string; code: string; name: string; description?: string; creditHours?: number; professorName?: string }) => {
    try {
      const response = await post('/study/units', data);
      if (response.success) {
        setUnits((prev) => [...prev, response.data]);
        return response.data;
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [post]);

  // Seed initial data (development)
  const seedData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await post('/study/seed');
      if (response.success) {
        await fetchSchools();
      }
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [post, fetchSchools]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedSchool(null);
    setSelectedCourse(null);
    setSelectedYear(null);
    setSelectedUnit(null);
  }, []);

  return {
    // Data
    universities,
    schools,
    courses,
    years,
    units,
    
    // Selected items
    selectedSchool,
    selectedCourse,
    selectedYear,
    selectedUnit,
    
    // State
    loading,
    error,
    
    // Fetch functions
    fetchUniversities,
    fetchSchools,
    fetchSchool,
    fetchCourses,
    fetchCourse,
    fetchCourseDetails,
    fetchYears,
    fetchYear,
    fetchUnits,
    fetchUnit,
    
    // Create functions
    createSchool,
    createCourse,
    createYear,
    createUnit,
    
    // Navigation
    clearSelection,
    
    // Dev
    seedData,
  };
}
