import { useState, useCallback } from 'react';
import { useApi } from './useApi';

export interface Resource {
  id: string;
  uploaderId: string;
  courseId?: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  semester?: string;
  resourceType: string;
  professorName?: string;
  isVerified: boolean;
  isProcessed: boolean;
  upvoteCount: number;
  downloadCount: number;
  viewCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  hasUpvoted?: boolean;
  uploader: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
  course?: {
    id: string;
    code: string;
    name: string;
    department: {
      id: string;
      code: string;
      name: string;
      university: {
        id: string;
        name: string;
      };
    };
  };
  _count?: {
    comments: number;
    upvotes: number;
  };
}

export interface ResourceFilters {
  courseId?: string;
  departmentId?: string;
  universityId?: string;
  semester?: string;
  resourceType?: string;
  professorName?: string;
  search?: string;
}

export interface University {
  id: string;
  name: string;
  domain?: string;
  logoUrl?: string;
  _count?: {
    departments: number;
  };
}

export interface Department {
  id: string;
  name: string;
  code: string;
  universityId: string;
  university?: University;
  _count?: {
    courses: number;
  };
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  departmentId: string;
  department?: Department;
  _count?: {
    resources: number;
  };
}

export interface ResourceType {
  value: string;
  label: string;
}

export function useResources() {
  const { get, post, del } = useApi();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);

  const fetchResources = useCallback(
    async (filters: ResourceFilters = {}, page = 1, refresh = false) => {
      try {
        if (refresh) setRefreshing(true);
        else setLoading(true);

        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '20');

        if (filters.courseId) params.append('courseId', filters.courseId);
        if (filters.departmentId) params.append('departmentId', filters.departmentId);
        if (filters.universityId) params.append('universityId', filters.universityId);
        if (filters.semester) params.append('semester', filters.semester);
        if (filters.resourceType) params.append('resourceType', filters.resourceType);
        if (filters.professorName) params.append('professorName', filters.professorName);
        if (filters.search) params.append('search', filters.search);

        const response = await get(`/resources?${params.toString()}`);

        if (response.success) {
          if (page === 1) {
            setResources(response.data.resources);
          } else {
            setResources((prev) => [...prev, ...response.data.resources]);
          }
          setPagination(response.data.pagination);
        }

        return response;
      } catch (error) {
        console.error('Error fetching resources:', error);
        throw error;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [get]
  );

  const fetchResourceTypes = useCallback(async () => {
    try {
      const response = await get('/courses/resource-types');
      if (response.success) {
        setResourceTypes(response.data);
      }
      return response;
    } catch (error) {
      console.error('Error fetching resource types:', error);
      throw error;
    }
  }, [get]);

  const getResource = useCallback(
    async (id: string) => {
      try {
        const response = await get(`/resources/${id}`);
        return response;
      } catch (error) {
        console.error('Error fetching resource:', error);
        throw error;
      }
    },
    [get]
  );

  const uploadResource = useCallback(
    async (formData: FormData) => {
      try {
        const response = await post('/resources', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response;
      } catch (error) {
        console.error('Error uploading resource:', error);
        throw error;
      }
    },
    [post]
  );

  const toggleUpvote = useCallback(
    async (resourceId: string) => {
      try {
        const response = await post(`/resources/${resourceId}/upvote`);
        if (response.success) {
          setResources((prev) =>
            prev.map((r) =>
              r.id === resourceId
                ? {
                    ...r,
                    hasUpvoted: response.data.upvoted,
                    upvoteCount: response.data.upvoted
                      ? r.upvoteCount + 1
                      : r.upvoteCount - 1,
                  }
                : r
            )
          );
        }
        return response;
      } catch (error) {
        console.error('Error toggling upvote:', error);
        throw error;
      }
    },
    [post]
  );

  const addComment = useCallback(
    async (resourceId: string, content: string, replyToId?: string) => {
      try {
        const response = await post(`/resources/${resourceId}/comments`, {
          content,
          replyToId,
        });
        return response;
      } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
      }
    },
    [post]
  );

  const deleteResource = useCallback(
    async (resourceId: string) => {
      try {
        const response = await del(`/resources/${resourceId}`);
        if (response.success) {
          setResources((prev) => prev.filter((r) => r.id !== resourceId));
        }
        return response;
      } catch (error) {
        console.error('Error deleting resource:', error);
        throw error;
      }
    },
    [del]
  );

  const downloadResource = useCallback(
    async (resourceId: string) => {
      try {
        const response = await get(`/resources/${resourceId}/download`);
        return response;
      } catch (error) {
        console.error('Error downloading resource:', error);
        throw error;
      }
    },
    [get]
  );

  return {
    resources,
    resourceTypes,
    loading,
    refreshing,
    pagination,
    fetchResources,
    fetchResourceTypes,
    getResource,
    uploadResource,
    toggleUpvote,
    addComment,
    deleteResource,
    downloadResource,
  };
}

export function useCourses() {
  const { get, post } = useApi();
  const [universities, setUniversities] = useState<University[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [semesters, setSemesters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUniversities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await get('/courses/universities');
      if (response.success) {
        setUniversities(response.data);
      }
      return response;
    } catch (error) {
      console.error('Error fetching universities:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [get]);

  const fetchDepartments = useCallback(
    async (universityId?: string) => {
      try {
        setLoading(true);
        const params = universityId ? `?universityId=${universityId}` : '';
        const response = await get(`/courses/departments${params}`);
        if (response.success) {
          setDepartments(response.data);
        }
        return response;
      } catch (error) {
        console.error('Error fetching departments:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [get]
  );

  const fetchCourses = useCallback(
    async (departmentId?: string, universityId?: string, search?: string) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (departmentId) params.append('departmentId', departmentId);
        if (universityId) params.append('universityId', universityId);
        if (search) params.append('search', search);

        const response = await get(`/courses?${params.toString()}`);
        if (response.success) {
          setCourses(response.data);
        }
        return response;
      } catch (error) {
        console.error('Error fetching courses:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [get]
  );

  const fetchResourceTypes = useCallback(async () => {
    try {
      const response = await get('/courses/resource-types');
      if (response.success) {
        setResourceTypes(response.data);
      }
      return response;
    } catch (error) {
      console.error('Error fetching resource types:', error);
      throw error;
    }
  }, [get]);

  const fetchSemesters = useCallback(async () => {
    try {
      const response = await get('/courses/semesters');
      if (response.success) {
        setSemesters(response.data);
      }
      return response;
    } catch (error) {
      console.error('Error fetching semesters:', error);
      throw error;
    }
  }, [get]);

  const createUniversity = useCallback(
    async (name: string, domain?: string, logoUrl?: string) => {
      try {
        const response = await post('/courses/universities', { name, domain, logoUrl });
        if (response.success) {
          setUniversities((prev) => [...prev, response.data]);
        }
        return response;
      } catch (error) {
        console.error('Error creating university:', error);
        throw error;
      }
    },
    [post]
  );

  const createDepartment = useCallback(
    async (universityId: string, name: string, code: string) => {
      try {
        const response = await post('/courses/departments', {
          universityId,
          name,
          code,
        });
        if (response.success) {
          setDepartments((prev) => [...prev, response.data]);
        }
        return response;
      } catch (error) {
        console.error('Error creating department:', error);
        throw error;
      }
    },
    [post]
  );

  const createCourse = useCallback(
    async (departmentId: string, code: string, name: string, description?: string) => {
      try {
        const response = await post('/courses', {
          departmentId,
          code,
          name,
          description,
        });
        if (response.success) {
          setCourses((prev) => [...prev, response.data]);
        }
        return response;
      } catch (error) {
        console.error('Error creating course:', error);
        throw error;
      }
    },
    [post]
  );

  return {
    universities,
    departments,
    courses,
    resourceTypes,
    semesters,
    loading,
    fetchUniversities,
    fetchDepartments,
    fetchCourses,
    fetchResourceTypes,
    fetchSemesters,
    createUniversity,
    createDepartment,
    createCourse,
  };
}
