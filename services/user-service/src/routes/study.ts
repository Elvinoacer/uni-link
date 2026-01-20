import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

const router = Router();

// Helper to get user ID from request
const getUserId = (req: Request): string | null => {
  const headerId = req.headers['x-user-id'] as string;
  if (headerId) return headerId;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      if (!token) return null;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
      return decoded.id || decoded.userId;
    } catch {
      return null;
    }
  }
  return null;
};

// Optional auth middleware (doesn't fail if not authenticated)
const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const userId = getUserId(req);
  if (userId) {
    (req as any).userId = userId;
  }
  next();
};

// Auth middleware
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  (req as any).userId = userId;
  next();
};

// ============================================
// SCHOOL ENDPOINTS
// ============================================

/**
 * GET /study/schools - List all schools
 * Hierarchy: School contains Courses
 */
router.get('/schools', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { universityId } = req.query;

    const schools = await prisma.school.findMany({
      where: universityId ? { universityId: universityId as string } : undefined,
      include: {
        university: {
          select: { id: true, name: true },
        },
        _count: {
          select: { courses: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    return res.json({
      success: true,
      data: schools.map((s) => ({
        ...s,
        courseCount: s._count.courses,
      })),
    });
  } catch (error: any) {
    logger.error('Error fetching schools:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /study/schools/:id - Get school details with courses
 */
router.get('/schools/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        university: true,
        courses: {
          include: {
            _count: {
              select: { yearsOfStudy: true },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!school) {
      return res.status(404).json({ success: false, error: 'School not found' });
    }

    return res.json({
      success: true,
      data: {
        ...school,
        courses: school.courses.map((c) => ({
          ...c,
          yearCount: c._count.yearsOfStudy,
        })),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching school:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /study/schools - Create a new school
 */
router.post('/schools', requireAuth, async (req: Request, res: Response) => {
  try {
    const { universityId, name, code, description, bannerUrl, color, iconName } = req.body;

    if (!universityId || !name || !code) {
      return res.status(400).json({
        success: false,
        error: 'universityId, name, and code are required',
      });
    }

    const school = await prisma.school.create({
      data: {
        universityId,
        name,
        code: code.toUpperCase(),
        description,
        bannerUrl,
        color,
        iconName,
      },
    });

    logger.info(`School created: ${school.name} (${school.code})`);

    return res.status(201).json({
      success: true,
      data: school,
    });
  } catch (error: any) {
    logger.error('Error creating school:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// COURSE ENDPOINTS (e.g., Computer Science)
// ============================================

/**
 * GET /study/courses - List courses for a school
 */
router.get('/courses', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { schoolId, search } = req.query;

    const courses = await prisma.course.findMany({
      where: {
        ...(schoolId && { schoolId: schoolId as string }),
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { code: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        school: {
          select: { id: true, name: true, code: true, color: true },
        },
        _count: {
          select: { yearsOfStudy: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({
      success: true,
      data: courses.map((c) => ({
        ...c,
        yearCount: c._count.yearsOfStudy,
      })),
    });
  } catch (error: any) {
    logger.error('Error fetching courses:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /study/courses/:id - Get course details with years
 */
router.get('/courses/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        school: {
          include: { university: true },
        },
        yearsOfStudy: {
          include: {
            _count: {
              select: { units: true },
            },
          },
          orderBy: { year: 'asc' },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    return res.json({
      success: true,
      data: {
        ...course,
        yearsOfStudy: course.yearsOfStudy.map((y) => ({
          ...y,
          unitCount: y._count.units,
        })),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching course:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /study/courses - Create a course (e.g., Computer Science)
 */
router.post('/courses', requireAuth, async (req: Request, res: Response) => {
  try {
    const { schoolId, code, name, description, bannerUrl } = req.body;

    if (!schoolId || !code || !name) {
      return res.status(400).json({
        success: false,
        error: 'schoolId, code, and name are required',
      });
    }

    const course = await prisma.course.create({
      data: {
        schoolId,
        code: code.toUpperCase(),
        name,
        description,
        bannerUrl,
      },
      include: {
        school: true,
      },
    });

    // Auto-create Year 1, 2, 3, 4 for the course
    for (let year = 1; year <= 4; year++) {
      await prisma.yearOfStudy.create({
        data: {
          courseId: course.id,
          year,
          name: `Year ${year}`,
        },
      });
    }

    logger.info(`Course created: ${course.name} (${course.code}) with 4 years`);

    return res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error: any) {
    logger.error('Error creating course:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// YEAR OF STUDY ENDPOINTS
// ============================================

/**
 * GET /study/years - List years of study for a course
 */
router.get('/years', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'courseId is required',
      });
    }

    const years = await prisma.yearOfStudy.findMany({
      where: { courseId: courseId as string },
      include: {
        _count: {
          select: { units: true },
        },
      },
      orderBy: { year: 'asc' },
    });

    return res.json({
      success: true,
      data: years.map((y) => ({
        ...y,
        unitCount: y._count.units,
      })),
    });
  } catch (error: any) {
    logger.error('Error fetching years:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /study/years/:id - Get year details with units
 */
router.get('/years/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const year = await prisma.yearOfStudy.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            school: true,
          },
        },
        units: {
          include: {
            _count: {
              select: { resources: true },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!year) {
      return res.status(404).json({ success: false, error: 'Year not found' });
    }

    return res.json({
      success: true,
      data: {
        ...year,
        units: year.units.map((u) => ({
          ...u,
          resourceCount: u._count.resources,
        })),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching year:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /study/years - Create a year of study
 */
router.post('/years', requireAuth, async (req: Request, res: Response) => {
  try {
    const { courseId, year, name, description } = req.body;

    if (!courseId || !year || !name) {
      return res.status(400).json({
        success: false,
        error: 'courseId, year, and name are required',
      });
    }

    const yearOfStudy = await prisma.yearOfStudy.create({
      data: {
        courseId,
        year: parseInt(year, 10),
        name,
        description,
      },
    });

    return res.status(201).json({
      success: true,
      data: yearOfStudy,
    });
  } catch (error: any) {
    logger.error('Error creating year:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// UNIT ENDPOINTS (e.g., CSC 311)
// ============================================

/**
 * GET /study/units - List units for a year of study
 */
router.get('/units', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { yearOfStudyId, search } = req.query;

    const units = await prisma.unit.findMany({
      where: {
        ...(yearOfStudyId && { yearOfStudyId: yearOfStudyId as string }),
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { code: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        yearOfStudy: {
          include: {
            course: {
              include: {
                school: true,
              },
            },
          },
        },
        _count: {
          select: { resources: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    return res.json({
      success: true,
      data: units.map((u) => ({
        ...u,
        resourceCount: u._count.resources,
      })),
    });
  } catch (error: any) {
    logger.error('Error fetching units:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /study/units/:id - Get unit details with resources
 */
router.get('/units/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        yearOfStudy: {
          include: {
            course: {
              include: {
                school: true,
              },
            },
          },
        },
        resources: {
          where: { status: 'active' },
          include: {
            uploader: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!unit) {
      return res.status(404).json({ success: false, error: 'Unit not found' });
    }

    return res.json({
      success: true,
      data: unit,
    });
  } catch (error: any) {
    logger.error('Error fetching unit:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /study/units - Create a unit (e.g., CSC 311)
 */
router.post('/units', requireAuth, async (req: Request, res: Response) => {
  try {
    const { yearOfStudyId, code, name, description, creditHours, professorName, orderIndex } = req.body;

    if (!yearOfStudyId || !code || !name) {
      return res.status(400).json({
        success: false,
        error: 'yearOfStudyId, code, and name are required',
      });
    }

    // Get the next order index if not provided
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      const lastUnit = await prisma.unit.findFirst({
        where: { yearOfStudyId },
        orderBy: { orderIndex: 'desc' },
      });
      finalOrderIndex = (lastUnit?.orderIndex ?? -1) + 1;
    }

    const unit = await prisma.unit.create({
      data: {
        yearOfStudyId,
        code: code.toUpperCase(),
        name,
        description,
        creditHours: creditHours ? parseInt(creditHours, 10) : null,
        professorName,
        orderIndex: finalOrderIndex,
      },
      include: {
        yearOfStudy: {
          include: {
            course: true,
          },
        },
      },
    });

    logger.info(`Unit created: ${unit.name} (${unit.code})`);

    return res.status(201).json({
      success: true,
      data: unit,
    });
  } catch (error: any) {
    logger.error('Error creating unit:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SEED DATA ENDPOINT (for initial setup)
// ============================================

/**
 * POST /study/seed - Seed initial data (development only)
 */
router.post('/seed', requireAuth, async (_req: Request, res: Response) => {
  try {
    // Create or get university
    let university = await prisma.university.findFirst();
    if (!university) {
      university = await prisma.university.create({
        data: {
          name: 'University',
          domain: 'university.edu',
        },
      });
    }

    // Sample schools data
    const schoolsData = [
      {
        code: 'SCI',
        name: 'School of Sciences',
        description: 'Natural and physical sciences',
        color: '#2196F3',
        iconName: 'flask',
        bannerUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
        courses: [
          { code: 'CS', name: 'Computer Science' },
          { code: 'MATH', name: 'Mathematics' },
          { code: 'PHYS', name: 'Physics' },
        ],
      },
      {
        code: 'ENG',
        name: 'School of Engineering',
        description: 'Engineering disciplines',
        color: '#FF5722',
        iconName: 'construct',
        bannerUrl: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=800',
        courses: [
          { code: 'EE', name: 'Electrical Engineering' },
          { code: 'ME', name: 'Mechanical Engineering' },
          { code: 'CE', name: 'Civil Engineering' },
        ],
      },
      {
        code: 'MED',
        name: 'School of Medicine',
        description: 'Medical and health sciences',
        color: '#E91E63',
        iconName: 'medkit',
        bannerUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
        courses: [
          { code: 'MED', name: 'Medicine' },
          { code: 'NURS', name: 'Nursing' },
          { code: 'PHAR', name: 'Pharmacy' },
        ],
      },
      {
        code: 'BUS',
        name: 'School of Business',
        description: 'Business and management',
        color: '#4CAF50',
        iconName: 'briefcase',
        bannerUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
        courses: [
          { code: 'ACC', name: 'Accounting' },
          { code: 'FIN', name: 'Finance' },
          { code: 'MKT', name: 'Marketing' },
        ],
      },
    ];

    const createdSchools = [];
    for (let i = 0; i < schoolsData.length; i++) {
      const schoolData = schoolsData[i]!;
      
      // Check if school already exists
      const existing = await prisma.school.findFirst({
        where: { universityId: university.id, code: schoolData.code },
      });
      
      if (!existing) {
        const school = await prisma.school.create({
          data: {
            universityId: university.id,
            code: schoolData.code,
            name: schoolData.name,
            description: schoolData.description,
            color: schoolData.color,
            iconName: schoolData.iconName,
            bannerUrl: schoolData.bannerUrl,
            orderIndex: i,
          },
        });
        createdSchools.push(school);

        // Create courses for each school
        for (const courseData of schoolData.courses) {
          const course = await prisma.course.create({
            data: {
              schoolId: school.id,
              code: courseData.code,
              name: courseData.name,
              bannerUrl: schoolData.bannerUrl, // Use school banner for now
            },
          });

          // Create years 1-4 for each course (6 for medicine)
          const maxYears = schoolData.code === 'MED' ? 6 : 4;
          for (let year = 1; year <= maxYears; year++) {
            await prisma.yearOfStudy.create({
              data: {
                courseId: course.id,
                year,
                name: `Year ${year}`,
                description: `${year}${['st', 'nd', 'rd'][year - 1] || 'th'} year of study`,
              },
            });
          }
        }
      }
    }

    logger.info(`Seeded ${createdSchools.length} schools with courses and years`);

    return res.json({
      success: true,
      data: {
        message: `Created ${createdSchools.length} schools with courses and years of study`,
        schools: createdSchools,
      },
    });
  } catch (error: any) {
    logger.error('Error seeding data:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
