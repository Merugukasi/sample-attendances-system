export interface Student {
  id: string;
  name: string;
  rollNo: string;
  degree: string;
  department: string;
  year: number;
  semester: number;
  isCR: boolean;
  email?: string;
  password?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
}

export interface CourseAssignment {
  id: string;
  courseId: string;
  degree: string;
  department: string;
  year: number;
  semester: number;
}

export interface AttendanceRecord {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  courseId: string;
  studentId: string;
  status: 'PRESENT' | 'ABSENT';
  markedBy: string; // CR ID
}

export type UserRole = 'ADMIN' | 'CR' | null;

export interface AppState {
  students: Student[];
  courses: Course[];
  assignments: CourseAssignment[];
  attendance: AttendanceRecord[];
  currentUser: Student | null; // If CR is logged in
  role: UserRole;
}

export const DEGREES = [
  'B.Tech', 
  'B.E.', 
  'B.Sc', 
  'B.A.', 
  'B.Com', 
  'BBA', 
  'BCA', 
  'M.Tech', 
  'M.Sc', 
  'M.A.', 
  'MBA', 
  'MCA', 
  'PhD'
];

export const DEPARTMENTS = [
  'Computer Science', 
  'Information Technology',
  'Electronics & Comm.', 
  'Electrical Engineering', 
  'Mechanical Engineering', 
  'Civil Engineering', 
  'Business Administration', 
  'Commerce', 
  'Economics', 
  'Psychology', 
  'English', 
  'Mathematics', 
  'Physics', 
  'Chemistry', 
  'Biology', 
  'Biotechnology', 
  'Law', 
  'History', 
  'Political Science', 
  'Sociology', 
  'Journalism', 
  'Architecture'
];

export const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What is the name of the city you were born in?",
  "What is your favorite food?",
  "What is the name of your first school?",
  "What is your favorite movie?",
  "What is your father's middle name?"
];

// Initial Students cleared as per request
export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_COURSES: Course[] = [
  // Computer Science & IT
  { id: 'cs101', name: 'Introduction to Programming', code: 'CS101' },
  { id: 'cs102', name: 'Data Structures & Algorithms', code: 'CS201' },
  
  
  
];

export const INITIAL_ASSIGNMENTS: CourseAssignment[] = [];