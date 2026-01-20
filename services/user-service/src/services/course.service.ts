import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export class CourseService {
  /**
   * Get all universities
   */
  async getUniversities() {
    try {
      const universities = await prisma.university.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { schools: true },
          },
        },
      });
      return universities.map(uni => ({
        ...uni,
        _count: { departments: uni._count.schools } // Map for legacy frontend compatibility
      }));
    } catch (error) {
      logger.error('Error fetching universities:', error);
      throw error;
    }
  }

  /**
   * Get university by ID with schools (mapped as departments)
   */
  async getUniversityById(id: string) {
    try {
      const university = await prisma.university.findUnique({
        where: { id },
        include: {
          schools: {
            orderBy: { name: 'asc' },
            include: {
              _count: {
                select: { yearsOfStudy: true },
              },
            },
          },
        },
      });
      
      if (university) {
        return {
          ...university,
          departments: university.schools, // Map schools to departments for compatibility
        };
      }
      return university;
    } catch (error) {
      logger.error('Error fetching university:', error);
      throw error;
    }
  }

  /**
   * Create a university (admin only)
   */
  async createUniversity(name: string, domain?: string, logoUrl?: string) {
    try {
      const university = await prisma.university.create({
        data: { name, domain, logoUrl },
      });
      return university;
    } catch (error) {
      logger.error('Error creating university:', error);
      throw error;
    }
  }

  /**
   * Get schools (aliased as departments for legacy support) by university
   */
  async getDepartments(universityId?: string) {
    try {
      const where = universityId ? { universityId } : {};
      const schools = await prisma.school.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          university: true,
          _count: {
            select: { yearsOfStudy: true },
          },
        },
      });
      return schools;
    } catch (error) {
      logger.error('Error fetching departments (schools):', error);
      throw error;
    }
  }

  /**
   * Get school (aliased as department) by ID
   */
  async getDepartmentById(id: string) {
    try {
      const school = await prisma.school.findUnique({
        where: { id },
        include: {
          university: true,
          yearsOfStudy: {
            include: {
              courses: {
                orderBy: { code: 'asc' },
                include: {
                  _count: {
                    select: { resources: true },
                  },
                },
              },
            },
          },
        },
      });
      
      if (school) {
        // Flatten courses from years for legacy view
        const courses = school.yearsOfStudy.flatMap(y => y.courses);
        return {
          ...school,
          courses,
        };
      }
      return school;
    } catch (error) {
      logger.error('Error fetching department (school):', error);
      throw error;
    }
  }

  /**
   * Create a school (aliased as department)
   */
  async createDepartment(universityId: string, name: string, code: string) {
    try {
      const school = await prisma.school.create({
        data: { 
          universityId, 
          name, 
          code: code.toUpperCase() 
        },
        include: { university: true },
      });
      return school;
    } catch (error) {
      logger.error('Error creating department (school):', error);
      throw error;
    }
  }

  /**
   * Get courses with optional filters (departmentId = schoolId)
   */
  async getCourses(departmentId?: string, universityId?: string, search?: string) {
    try {
      const where: any = {};

      if (departmentId) {
        // Treat departmentId as schoolId
        where.yearOfStudy = {
          schoolId: departmentId
        };
      }

      if (universityId) {
        where.yearOfStudy = {
          school: {
            universityId: universityId,
          }
        };
      }

      if (search) {
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      const courses = await prisma.course.findMany({
        where,
        orderBy: { code: 'asc' },
        include: {
          yearOfStudy: {
            include: {
              school: {
                include: {
                  university: true,
                },
              },
            },
          },
          _count: {
            select: { resources: true },
          },
        },
      });
      
      // Map response to match legacy structure if needed
      return courses.map(c => ({
        ...c,
        department: c.yearOfStudy?.school,
      }));
    } catch (error) {
      logger.error('Error fetching courses:', error);
      throw error;
    }
  }

  /**
   * Get course by ID
   */
  async getCourseById(id: string) {
    try {
      const course = await prisma.course.findUnique({
        where: { id },
        include: {
          yearOfStudy: {
            include: {
              school: {
                include: {
                  university: true,
                },
              },
            },
          },
          _count: {
            select: { resources: true },
          },
        },
      });
      
      if (course) {
        return {
          ...course,
          department: course.yearOfStudy?.school,
        };
      }
      return course;
    } catch (error) {
      logger.error('Error fetching course:', error);
      throw error;
    }
  }

  /**
   * Create a course (admin or moderator)
   * NOTE: This is legacy and might fail if defaulting logic isn't perfect, 
   * but we'll try to get the first year of the school.
   */
  async createCourse(departmentId: string, code: string, name: string, description?: string) {
    try {
      // Find the school (departmentId is schoolId)
      const school = await prisma.school.findUnique({
        where: { id: departmentId },
        include: { yearsOfStudy: { orderBy: { year: 'asc' }, take: 1 } }
      });

      if (!school) {
        throw new Error('School (Department) not found');
      }

      let yearOfStudyId = school.yearsOfStudy[0]?.id;

      // If no year exists, create Year 1
      if (!yearOfStudyId) {
        const year1 = await prisma.yearOfStudy.create({
          data: {
            schoolId: departmentId,
            year: 1,
            name: 'Year 1'
          }
        });
        yearOfStudyId = year1.id;
      }

      const course = await prisma.course.create({
        data: { 
          yearOfStudyId, 
          code, 
          name, 
          description 
        },
        include: {
          yearOfStudy: {
            include: {
              school: {
                include: {
                  university: true,
                },
              },
            },
          },
        },
      });
      
      return {
        ...course,
        department: course.yearOfStudy?.school
      };
    } catch (error) {
      logger.error('Error creating course:', error);
      throw error;
    }
  }

  /**
   * Get available semesters (from existing resources)
   */
  async getAvailableSemesters() {
    try {
      const semesters = await prisma.resource.findMany({
        where: {
          semester: { not: null },
          status: 'active',
        },
        select: { semester: true },
        distinct: ['semester'],
        orderBy: { semester: 'desc' },
      });
      return semesters.map((s) => s.semester).filter(Boolean);
    } catch (error) {
      logger.error('Error fetching semesters:', error);
      throw error;
    }
  }

  /**
   * Get resource types
   */
  getResourceTypes() {
    return [
      { value: 'lecture_notes', label: 'Lecture Notes' },
      { value: 'assignment', label: 'Assignment' },
      { value: 'exam', label: 'Exam/Quiz' },
      { value: 'textbook', label: 'Textbook' },
      { value: 'slide_deck', label: 'Slide Deck' },
      { value: 'lab_report', label: 'Lab Report' },
      { value: 'project', label: 'Project' },
      { value: 'other', label: 'Other' },
    ];
  }
}

export const courseService = new CourseService();
