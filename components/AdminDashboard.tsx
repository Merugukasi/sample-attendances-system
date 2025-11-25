import React, { useState, useMemo } from 'react';
import { Student, Course, CourseAssignment, DEPARTMENTS, DEGREES, AttendanceRecord, SECURITY_QUESTIONS } from '../types';
import { Button, Input, Select, Card } from './ui';
import { generateStudentsAI } from '../services/geminiService';

interface AdminDashboardProps {
  students: Student[];
  courses: Course[];
  assignments: CourseAssignment[];
  attendance: AttendanceRecord[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setAssignments: React.Dispatch<React.SetStateAction<CourseAssignment[]>>;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students, courses, assignments, attendance, setStudents, setCourses, setAssignments, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'course_struct' | 'attendance'>('dashboard');
  const [manageSubTab, setManageSubTab] = useState<'assignments' | 'library'>('assignments');
  const [loadingAI, setLoadingAI] = useState(false);

  // --- STUDENT FORM STATE ---
  const [newStudent, setNewStudent] = useState({ 
    name: '', 
    rollNo: '', 
    email: '',
    degree: 'B.Tech',
    department: 'Computer Science', 
    year: 1, 
    semester: 1, 
    isCR: false,
    password: '',
    securityQuestion: '',
    securityAnswer: ''
  });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  
  // --- SUBJECT LIBRARY FORM STATE ---
  const [courseForm, setCourseForm] = useState({ name: '', code: '' });
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // --- ASSIGNMENT FORM STATE (Bulk) ---
  const [assignDegree, setAssignDegree] = useState('B.Tech');
  const [assignDept, setAssignDept] = useState('Computer Science');
  const [assignYear, setAssignYear] = useState(1);
  const [assignSemester, setAssignSemester] = useState(1);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // --- ATTENDANCE HISTORY STATE ---
  const [histDegree, setHistDegree] = useState('B.Tech');
  const [histDept, setHistDept] = useState('Computer Science');
  const [histYear, setHistYear] = useState(1);
  const [histSem, setHistSem] = useState(1);
  const [histSubjectId, setHistSubjectId] = useState<string>('');
  const [histView, setHistView] = useState<'students' | 'sessions'>('students');
  const [viewSessionDate, setViewSessionDate] = useState<string | null>(null);
  
  // --- STUDENT ACTIONS ---
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudentId) {
      setStudents(prev => prev.map(s => s.id === editingStudentId ? { ...s, ...newStudent, isCR: Boolean(newStudent.isCR) } : s));
      setEditingStudentId(null);
    } else {
      const student: Student = {
        id: Date.now().toString(),
        ...newStudent,
        isCR: Boolean(newStudent.isCR)
      };
      setStudents(prev => [...prev, student]);
    }
    // Reset fields but keep context for faster entry
    setNewStudent(prev => ({ ...prev, name: '', rollNo: '', email: '', isCR: false, password: '', securityQuestion: '', securityAnswer: '' }));
  };

  const handleEditStudent = (student: Student) => {
    setNewStudent({
      name: student.name,
      rollNo: student.rollNo,
      email: student.email || '',
      degree: student.degree || 'B.Tech',
      department: student.department || 'Computer Science',
      year: student.year,
      semester: student.semester,
      isCR: student.isCR,
      password: student.password || '',
      securityQuestion: student.securityQuestion || '',
      securityAnswer: student.securityAnswer || ''
    });
    setEditingStudentId(student.id);
  };

  const handleDeleteStudent = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this student?')) {
      setStudents(prev => prev.filter(s => s.id !== id));
      if (editingStudentId === id) {
        handleCancelStudentEdit();
      }
    }
  };

  const handleCancelStudentEdit = () => {
    setEditingStudentId(null);
    setNewStudent({ name: '', rollNo: '', email: '', degree: 'B.Tech', department: 'Computer Science', year: 1, semester: 1, isCR: false, password: '', securityQuestion: '', securityAnswer: '' });
  };

  const handleGenerateAI = async () => {
    setLoadingAI(true);
    try {
      const generated = await generateStudentsAI(
        5, 
        newStudent.degree,
        newStudent.department, 
        newStudent.year, 
        newStudent.semester, 
        2024000 + students.length
      );
      setStudents(prev => [...prev, ...generated]);
    } catch (e) {
      alert("AI Generation failed");
    } finally {
      setLoadingAI(false);
    }
  };

  // --- COURSE LIBRARY ACTIONS ---
  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCourseId) {
      setCourses(prev => prev.map(c => c.id === editingCourseId ? { ...c, ...courseForm } : c));
      setEditingCourseId(null);
    } else {
      const newCourse: Course = {
        id: `course_${Date.now()}`,
        ...courseForm
      };
      setCourses(prev => [...prev, newCourse]);
    }
    setCourseForm({ name: '', code: '' });
  };

  const handleEditCourse = (course: Course) => {
    setCourseForm({ name: course.name, code: course.code });
    setEditingCourseId(course.id);
  };

  const handleDeleteCourse = (id: string) => {
    if (window.confirm('Delete this subject? This will also remove it from any active class assignments.')) {
      setCourses(prev => prev.filter(c => c.id !== id));
      setAssignments(prev => prev.filter(a => a.courseId !== id)); // Cascade delete
      if (editingCourseId === id) {
        setEditingCourseId(null);
        setCourseForm({ name: '', code: '' });
      }
    }
  };

  const handleCancelCourseEdit = () => {
    setEditingCourseId(null);
    setCourseForm({ name: '', code: '' });
  };

  // --- ASSIGNMENT ACTIONS (BULK) ---
  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const toggleSelectAll = () => {
    const currentAssigned = assignments
      .filter(a => 
        a.degree === assignDegree &&
        a.department === assignDept && 
        a.year === assignYear && 
        a.semester === assignSemester
      )
      .map(a => a.courseId);
    
    const availableCourses = courses.filter(c => !currentAssigned.includes(c.id)).map(c => c.id);
    
    if (selectedCourseIds.length === availableCourses.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(availableCourses);
    }
  };
  
  const handleAssignMultiple = () => {
    if (selectedCourseIds.length === 0) {
      alert("Please select at least one subject to assign.");
      return;
    }
    if (isNaN(assignYear) || isNaN(assignSemester)) {
      alert("Please enter a valid Year and Semester.");
      return;
    }

    const newAssignments: CourseAssignment[] = [];
    let duplicateCount = 0;

    selectedCourseIds.forEach((courseId) => {
      const exists = assignments.some(a => 
        a.courseId === courseId && 
        a.degree === assignDegree &&
        a.department === assignDept && 
        a.year === assignYear && 
        a.semester === assignSemester
      );

      if (!exists) {
        const uniqueId = `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${courseId}`;
        newAssignments.push({
          id: uniqueId,
          courseId,
          degree: assignDegree,
          department: assignDept,
          year: assignYear,
          semester: assignSemester
        });
      } else {
        duplicateCount++;
      }
    });

    if (newAssignments.length > 0) {
      setAssignments(prev => [...prev, ...newAssignments]);
      setSelectedCourseIds([]); // Reset selection
      alert(`Successfully assigned ${newAssignments.length} subject(s) to ${assignDegree} - ${assignDept} - Y${assignYear}/S${assignSemester}.`);
    } else if (duplicateCount > 0) {
      alert("Selected subjects are already assigned to this class.");
    }
  };

  const handleDeleteAssignment = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Remove this subject assignment?')) {
      setAssignments(prev => prev.filter(a => a.id !== id));
    }
  };

  // Group assignments by Degree/Dept/Year/Semester
  const groupedAssignments = useMemo(() => {
    const grouped: Record<string, CourseAssignment[]> = {};
    assignments.forEach(a => {
      const key = `${a.degree} - ${a.department} - Y${a.year} / S${a.semester}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    });
    return Object.keys(grouped).sort().reduce((obj, key) => {
      obj[key] = grouped[key];
      return obj;
    }, {} as Record<string, CourseAssignment[]>);
  }, [assignments]);

  // --- ATTENDANCE HISTORY CALCULATIONS ---
  
  // 1. Get Subjects for History Dropdown
  const historySubjects = useMemo(() => {
    return assignments
      .filter(a => 
        a.degree === histDegree && 
        a.department === histDept && 
        a.year === histYear && 
        a.semester === histSem
      )
      .map(a => courses.find(c => c.id === a.courseId))
      .filter((c): c is Course => !!c);
  }, [assignments, courses, histDegree, histDept, histYear, histSem]);

  // 2. Get Students for selected class
  const historyStudents: Student[] = useMemo(() => {
    return students.filter(s => 
      s.degree === histDegree &&
      s.department === histDept &&
      s.year === histYear &&
      s.semester === histSem
    );
  }, [students, histDegree, histDept, histYear, histSem]);

  // 3. Get Sessions (Dates) for selected subject
  const historySessions = useMemo(() => {
    if (!histSubjectId) return [];
    
    // Get all records for this course
    const courseRecords = attendance.filter(a => a.courseId === histSubjectId);
    
    // Group by Date
    const dates = Array.from(new Set(courseRecords.map(r => r.date)));
    
    return dates.sort().reverse().map(date => {
      const dateRecords = courseRecords.filter(r => r.date === date);
      // Filter records only for currently registered students to avoid stale data issues
      const studentIds = historyStudents.map(s => s.id);
      const validRecords = dateRecords.filter(r => studentIds.includes(r.studentId));
      
      const present = validRecords.filter(r => r.status === 'PRESENT').length;
      return {
        date,
        totalStudents: historyStudents.length,
        present,
        records: validRecords
      };
    });
  }, [attendance, histSubjectId, historyStudents]);

  // 4. Student Stats for selected subject
  const historyStudentStats = useMemo(() => {
    if (!histSubjectId) return [];
    
    const totalSessions = historySessions.length;
    
    return historyStudents.map(student => {
      // Find all records for this student in this subject
      const studentRecords = attendance.filter(a => 
        a.courseId === histSubjectId && 
        a.studentId === student.id
      );
      
      const presentCount = studentRecords.filter(a => a.status === 'PRESENT').length;
      const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
      
      return {
        ...student,
        presentCount,
        totalSessions,
        percentage
      };
    }).sort((a, b) => a.rollNo.localeCompare(b.rollNo));
  }, [attendance, histSubjectId, historyStudents, historySessions]);

  // 5. Selected Session Details
  const sessionDetails = useMemo<any>(() => {
    if (!viewSessionDate || !histSubjectId) return null;
    
    // Get records for this date and subject
    const records = attendance.filter(a => a.courseId === histSubjectId && a.date === viewSessionDate);
    
    return historyStudents.map(student => {
        const record = records.find(r => r.studentId === student.id);
        return {
            ...student,
            status: record ? record.status : 'N/A'
        };
    }).sort((a, b) => a.rollNo.localeCompare(b.rollNo));
  }, [viewSessionDate, histSubjectId, attendance, historyStudents]);

  // --- DASHBOARD METRICS ---
  const studentsPerDept = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      counts[s.department] = (counts[s.department] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [students]);


  const degreeOptions = DEGREES.map(d => ({ value: d, label: d }));
  const deptOptions = DEPARTMENTS.map(d => ({ value: d, label: d }));

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="bg-indigo-900 text-white w-full md:w-72 flex-shrink-0 flex flex-col transition-all duration-300 shadow-xl z-20">
        <div className="p-6 border-b border-indigo-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">UniTrack</h1>
                <p className="text-indigo-300 text-xs">Admin Console</p>
              </div>
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activeTab === 'dashboard' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <svg className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            <span className="font-medium">Dashboard</span>
          </button>

          <button 
            onClick={() => setActiveTab('students')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activeTab === 'students' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <svg className={`w-5 h-5 ${activeTab === 'students' ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <span className="font-medium">Students</span>
          </button>

          <button 
            onClick={() => setActiveTab('course_struct')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activeTab === 'course_struct' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <svg className={`w-5 h-5 ${activeTab === 'course_struct' ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            <span className="font-medium">Manage Subjects</span>
          </button>

          <button 
            onClick={() => setActiveTab('attendance')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activeTab === 'attendance' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <svg className={`w-5 h-5 ${activeTab === 'attendance' ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            <span className="font-medium">Attendance History</span>
          </button>
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button 
            onClick={onLogout} 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-indigo-200 hover:bg-red-900/50 hover:text-red-200 transition-colors group"
          >
            <svg className="w-5 h-5 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
           <header className="mb-8 pb-6 border-b border-gray-200">
              <h2 className="text-3xl font-bold text-gray-900">
                 {activeTab === 'dashboard' && 'Dashboard Overview'}
                 {activeTab === 'students' && 'Student Management'}
                 {activeTab === 'course_struct' && 'Subject Configuration'}
                 {activeTab === 'attendance' && 'Attendance Reports'}
              </h2>
              <p className="text-gray-500 mt-2">
                 {activeTab === 'dashboard' && 'Welcome back! Here is a summary of your institution\'s status.'}
                 {activeTab === 'students' && 'Register students, manage profiles, and assign Class Representatives.'}
                 {activeTab === 'course_struct' && 'Manage the global subject library and assign subjects to specific classes.'}
                 {activeTab === 'attendance' && 'View detailed attendance analytics and session history.'}
              </p>
           </header>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Total Students */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center transition-transform hover:scale-105 duration-200">
                    <div className="p-4 rounded-full bg-indigo-100 text-indigo-600 mr-5">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Students</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{students.length}</p>
                    </div>
                </div>
                
                {/* Card 2: Total Courses */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center transition-transform hover:scale-105 duration-200">
                    <div className="p-4 rounded-full bg-blue-100 text-blue-600 mr-5">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Courses</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{courses.length}</p>
                    </div>
                </div>

                {/* Card 3: Departments */}
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center transition-transform hover:scale-105 duration-200">
                    <div className="p-4 rounded-full bg-green-100 text-green-600 mr-5">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Departments</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{DEPARTMENTS.length}</p>
                    </div>
                </div>
            </div>

            {/* Distribution Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Student Distribution by Department">
                    {studentsPerDept.length > 0 ? (
                        <div className="space-y-5">
                            {studentsPerDept.slice(0, 5).map(([dept, count]) => (
                                <div key={dept}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-700 font-medium">{dept}</span>
                                        <span className="font-bold text-gray-900">{count}</span>
                                    </div>
                                     <div className="w-full bg-gray-100 rounded-full h-2.5">
                                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(count / students.length) * 100}%` }}></div>
                                     </div>
                                </div>
                            ))}
                            {studentsPerDept.length > 5 && (
                                <p className="text-xs text-center text-gray-500 mt-4">+ {studentsPerDept.length - 5} more departments with fewer students</p>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                          <p>No student data available.</p>
                          <button onClick={() => setActiveTab('students')} className="text-indigo-600 text-sm mt-2 hover:underline">Go to Students tab</button>
                        </div>
                    )}
                </Card>

                 {/* Quick Actions */}
                 <Card title="Quick Actions">
                    <div className="grid grid-cols-2 gap-4 h-full">
                        <button onClick={() => setActiveTab('students')} className="flex flex-col items-center justify-center p-6 border border-gray-100 rounded-xl hover:bg-indigo-50 hover:border-indigo-100 transition-all group">
                             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                             </div>
                             <span className="text-base font-semibold text-gray-900">Add New Student</span>
                        </button>
                         <button onClick={() => { setActiveTab('course_struct'); setManageSubTab('library'); }} className="flex flex-col items-center justify-center p-6 border border-gray-100 rounded-xl hover:bg-blue-50 hover:border-blue-100 transition-all group">
                             <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                             </div>
                             <span className="text-base font-semibold text-gray-900">Add New Subject</span>
                        </button>
                    </div>
                </Card>
            </div>
            
            {/* All Departments List - Added for visibility */}
            <Card title="All Departments">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {DEPARTMENTS.map((dept) => (
                      <div key={dept} className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                         {dept}
                      </div>
                  ))}
               </div>
            </Card>
          </div>
        )}

        {/* Students Management */}
        {activeTab === 'students' && (
          <div className="grid xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1">
              <Card title={editingStudentId ? "Edit Student" : "Add New Student"}>
                <form onSubmit={handleAddStudent}>
                  <Input 
                    label="Full Name" 
                    value={newStudent.name} 
                    onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                    required 
                  />
                  <Input 
                    label="Roll Number" 
                    value={newStudent.rollNo} 
                    onChange={e => setNewStudent({...newStudent, rollNo: e.target.value})}
                    required 
                  />
                  <Input 
                    label="Email (for recovery)" 
                    type="email"
                    value={newStudent.email} 
                    onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                    required={newStudent.isCR}
                    placeholder="student@example.com"
                  />
                  
                  <Select 
                    label="Degree"
                    options={degreeOptions}
                    value={newStudent.degree}
                    onChange={e => setNewStudent({...newStudent, degree: e.target.value})}
                  />
                  <Select 
                    label="Department"
                    options={deptOptions}
                    value={newStudent.department}
                    onChange={e => setNewStudent({...newStudent, department: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Year" 
                      type="number" 
                      min={1} max={4}
                      value={newStudent.year} 
                      onChange={e => setNewStudent({...newStudent, year: parseInt(e.target.value)})}
                    />
                    <Input 
                      label="Semester" 
                      type="number" 
                      min={1} max={8}
                      value={newStudent.semester} 
                      onChange={e => setNewStudent({...newStudent, semester: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="mb-4 flex items-center">
                    <input 
                      type="checkbox" 
                      id="isCR" 
                      checked={newStudent.isCR} 
                      onChange={e => setNewStudent({...newStudent, isCR: e.target.checked})}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isCR" className="ml-2 block text-sm text-gray-900">Is Class Representative?</label>
                  </div>
                  
                  {/* CR Specific Fields */}
                  <Input 
                    label="Password (for CR Login)" 
                    value={newStudent.password} 
                    onChange={e => setNewStudent({...newStudent, password: e.target.value})}
                    placeholder="Default: 12345"
                    disabled={!newStudent.isCR}
                  />

                  {newStudent.isCR && (
                    <div className="bg-indigo-50 p-4 rounded-md mb-4 border border-indigo-100">
                      <h4 className="text-sm font-semibold text-indigo-900 mb-3">Security & Recovery</h4>
                      <Select 
                        label="Security Question"
                        options={[{value: '', label: 'Select a question...'}, ...SECURITY_QUESTIONS.map(q => ({value: q, label: q}))]}
                        value={newStudent.securityQuestion}
                        onChange={e => setNewStudent({...newStudent, securityQuestion: e.target.value})}
                      />
                      <Input 
                        label="Security Answer" 
                        value={newStudent.securityAnswer} 
                        onChange={e => setNewStudent({...newStudent, securityAnswer: e.target.value})}
                        placeholder="Answer"
                        type="password" 
                      />
                      <p className="text-xs text-indigo-600 mt-1">Used for password recovery if email is inaccessible.</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingStudentId ? 'Update Student' : 'Add Student'}
                      </Button>
                      {editingStudentId && (
                        <Button type="button" variant="secondary" onClick={handleCancelStudentEdit}>
                          Cancel
                        </Button>
                      )}
                    </div>
                    
                    {!editingStudentId && (
                      <Button type="button" variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleGenerateAI} disabled={loadingAI}>
                        {loadingAI ? (
                           <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        )}
                        Generate with AI
                      </Button>
                    )}
                  </div>
                </form>
              </Card>
            </div>
            <div className="xl:col-span-2">
              <Card title={`Registered Students (${students.length})`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((s) => (
                        <tr key={s.id} className={editingStudentId === s.id ? "bg-indigo-50" : ""}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.rollNo}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {s.name}
                            <div className="text-xs text-gray-400">{s.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">{s.degree}</span>
                              <span className="text-xs text-gray-500">{s.department}</span>
                            </div>
                            <span className="text-xs text-gray-400">Y{s.year}/S{s.semester}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {s.isCR ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">CR</span> : 'Student'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                            <button type="button" onClick={() => handleEditStudent(s)} className="text-indigo-600 hover:bg-indigo-100 rounded-full p-2 transition-colors">
                              <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button type="button" onClick={(e) => handleDeleteStudent(e, s.id)} className="text-red-600 hover:bg-red-100 rounded-full p-2 transition-colors">
                              <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Manage Subjects Tab */}
        {activeTab === 'course_struct' && (
          <div>
            {/* Sub Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
              <button
                onClick={() => setManageSubTab('assignments')}
                className={`py-2 px-4 text-sm font-medium ${
                  manageSubTab === 'assignments' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Class Assignments
              </button>
              <button
                onClick={() => setManageSubTab('library')}
                className={`py-2 px-4 text-sm font-medium ${
                  manageSubTab === 'library' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Subject Library (Global)
              </button>
            </div>

            {/* Class Assignments View */}
            {manageSubTab === 'assignments' && (
              <div className="grid xl:grid-cols-3 gap-8">
                <div className="xl:col-span-1">
                  <Card title="Assign Subjects to Class">
                    <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                      <h3 className="text-sm font-semibold text-indigo-800 mb-3">1. Select Target Class</h3>
                      <div className="space-y-3">
                        <Select 
                            label="Degree"
                            options={degreeOptions}
                            value={assignDegree}
                            onChange={e => setAssignDegree(e.target.value)}
                            className="mb-0"
                        />
                        <Select 
                            label="Department"
                            options={deptOptions}
                            value={assignDept}
                            onChange={e => setAssignDept(e.target.value)}
                            className="mb-0"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-medium text-indigo-600 mb-1">Year</label>
                              <input 
                                type="number" min={1} max={4}
                                className="w-full px-3 py-2 border border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                value={assignYear} 
                                onChange={e => setAssignYear(parseInt(e.target.value))}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-indigo-600 mb-1">Semester</label>
                              <input 
                                type="number" min={1} max={8}
                                className="w-full px-3 py-2 border border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                value={assignSemester} 
                                onChange={e => setAssignSemester(parseInt(e.target.value))}
                              />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">2. Select Subjects</h3>
                      </div>

                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-xs text-gray-500">Available from Library</span>
                        <button 
                          onClick={toggleSelectAll}
                          className="text-xs text-indigo-600 font-medium hover:underline"
                        >
                          {selectedCourseIds.length > 0 ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      <div className="border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto mb-4 bg-white">
                        {courses.length === 0 ? (
                          <div className="p-4 text-sm text-gray-400 text-center">
                            Library is empty. 
                            <button onClick={() => setManageSubTab('library')} className="text-indigo-600 hover:underline ml-1">Go to Subject Library</button> 
                            to add subjects.
                          </div>
                        ) : (
                          courses.map(course => {
                            const isAssigned = assignments.some(a => 
                              a.courseId === course.id && 
                              a.degree === assignDegree &&
                              a.department === assignDept && 
                              a.year === assignYear && 
                              a.semester === assignSemester
                            );
                            return (
                              <label key={course.id} className={`flex items-center p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${isAssigned ? 'bg-gray-100 opacity-60' : ''}`}>
                                <input 
                                  type="checkbox"
                                  checked={selectedCourseIds.includes(course.id)}
                                  onChange={() => !isAssigned && toggleCourseSelection(course.id)}
                                  disabled={isAssigned}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <div className="ml-3">
                                  <p className={`text-sm font-medium ${isAssigned ? 'text-gray-500' : 'text-gray-900'}`}>
                                    {course.name}
                                  </p>
                                  <p className="text-xs text-gray-400">{course.code} {isAssigned && '(Assigned)'}</p>
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>
                      
                      <Button 
                        type="button"
                        onClick={handleAssignMultiple} 
                        className="w-full flex justify-center items-center gap-2" 
                        disabled={selectedCourseIds.length === 0}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Assign {selectedCourseIds.length} Subject{selectedCourseIds.length !== 1 ? 's' : ''}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2 text-center">Subjects will be assigned to {assignDegree} - {assignDept} - Y{assignYear}/S{assignSemester}.</p>
                    </div>
                  </Card>
                </div>
                <div className="xl:col-span-2 space-y-6">
                  {Object.keys(groupedAssignments).length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200 text-gray-500">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Assigned</h3>
                      <p>Select a Degree, Department, Year and Semester on the left, choose subjects, and click Assign.</p>
                    </div>
                  ) : (
                    Object.entries(groupedAssignments).map(([groupName, groupAssignments]) => (
                      <Card key={groupName} title={groupName} className="mb-4">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {groupAssignments.map((a) => {
                                const course = courses.find(c => c.id === a.courseId);
                                return (
                                  <tr key={a.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                                      {course?.code || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {course?.name || 'Unknown Subject'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                        <button 
                                          type="button" 
                                          onClick={(e) => handleDeleteAssignment(e, a.id)} 
                                          className="text-red-600 hover:bg-red-100 rounded-full p-2 transition-colors" 
                                          title="Remove Assignment"
                                        >
                                          <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Subject Library View (CRUD) */}
            {manageSubTab === 'library' && (
              <div className="grid xl:grid-cols-3 gap-8">
                <div className="xl:col-span-1">
                  <Card title={editingCourseId ? "Edit Subject" : "Add New Subject"}>
                    <form onSubmit={handleAddCourse}>
                      <Input 
                        label="Subject Name" 
                        value={courseForm.name} 
                        onChange={e => setCourseForm({...courseForm, name: e.target.value})}
                        placeholder="e.g. Advanced Data Structures"
                        required 
                      />
                      <Input 
                        label="Subject Code" 
                        value={courseForm.code} 
                        onChange={e => setCourseForm({...courseForm, code: e.target.value})}
                        placeholder="e.g. CS501"
                        required 
                      />
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                          {editingCourseId ? 'Update Subject' : 'Add Subject'}
                        </Button>
                        {editingCourseId && (
                          <Button type="button" variant="secondary" onClick={handleCancelCourseEdit}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </Card>
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-xs text-yellow-800">
                    <strong>Note:</strong> Subjects added here become available in the "Class Assignments" tab for all degrees.
                  </div>
                </div>

                <div className="xl:col-span-2">
                  <Card title={`Global Subject Library (${courses.length})`}>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {courses.map((course) => (
                            <tr key={course.id} className={editingCourseId === course.id ? "bg-indigo-50" : ""}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{course.code}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{course.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                <button type="button" onClick={() => handleEditCourse(course)} className="text-indigo-600 hover:bg-indigo-100 rounded-full p-2 transition-colors">
                                  <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                <button type="button" onClick={() => handleDeleteCourse(course.id)} className="text-red-600 hover:bg-red-100 rounded-full p-2 transition-colors">
                                  <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                          {courses.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No subjects in library. Add one to get started.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attendance History Tab */}
        {activeTab === 'attendance' && (
           <div className="space-y-6">
             {/* 1. Filter Section */}
             <Card title="Attendance Filters">
                <div className="grid md:grid-cols-4 gap-4 items-end">
                   <Select 
                      label="Degree"
                      options={degreeOptions}
                      value={histDegree}
                      onChange={e => {
                        setHistDegree(e.target.value);
                        setHistSubjectId('');
                      }}
                      className="mb-0"
                   />
                   <Select 
                      label="Department"
                      options={deptOptions}
                      value={histDept}
                      onChange={e => {
                        setHistDept(e.target.value);
                        setHistSubjectId('');
                      }}
                      className="mb-0"
                   />
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <input 
                        type="number" min={1} max={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={histYear} 
                        onChange={e => {
                          setHistYear(parseInt(e.target.value));
                          setHistSubjectId('');
                        }}
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                      <input 
                        type="number" min={1} max={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={histSem} 
                        onChange={e => {
                          setHistSem(parseInt(e.target.value));
                          setHistSubjectId('');
                        }}
                      />
                   </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject for History</label>
                    <div className="flex flex-wrap gap-2">
                        {historySubjects.length > 0 ? (
                           historySubjects.map(sub => (
                             <button
                               key={sub.id}
                               onClick={() => setHistSubjectId(sub.id)}
                               className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                 histSubjectId === sub.id 
                                   ? 'bg-indigo-600 text-white border-indigo-600' 
                                   : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300 hover:bg-indigo-50'
                               }`}
                             >
                               {sub.name} <span className="text-xs opacity-75 ml-1">({sub.code})</span>
                             </button>
                           ))
                        ) : (
                          <div className="text-sm text-gray-500 italic">No subjects assigned to this class yet.</div>
                        )}
                    </div>
                </div>
             </Card>

             {histSubjectId && (
               <div className="grid lg:grid-cols-3 gap-6">
                 {/* Left: Summary and Session Log */}
                 <div className="lg:col-span-2">
                   <Card>
                      <div className="border-b border-gray-100 mb-4 pb-4">
                         <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">
                              {historySubjects.find(c => c.id === histSubjectId)?.name} History
                            </h3>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                               <button 
                                 onClick={() => setHistView('students')}
                                 className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${histView === 'students' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                               >
                                 Student Report
                               </button>
                               <button 
                                 onClick={() => setHistView('sessions')}
                                 className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${histView === 'sessions' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                               >
                                 Session Log
                               </button>
                            </div>
                         </div>
                      </div>

                      {histView === 'students' ? (
                         <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                               <tr>
                                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                 <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Attendance %</th>
                                 <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Status</th>
                               </tr>
                             </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                               {historyStudentStats.map(s => (
                                 <tr key={s.id}>
                                   <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.rollNo}</td>
                                   <td className="px-4 py-3 text-sm text-gray-500">{s.name}</td>
                                   <td className="px-4 py-3 text-sm text-center">
                                     <div className="flex items-center justify-center gap-2">
                                       <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                                         <div className={`h-full rounded-full ${s.percentage >= 75 ? 'bg-green-500' : s.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${s.percentage}%` }}></div>
                                       </div>
                                       <span className="font-medium">{s.percentage}%</span>
                                     </div>
                                   </td>
                                   <td className="px-4 py-3 text-sm text-right text-gray-500">
                                      {s.presentCount}/{s.totalSessions} Present
                                   </td>
                                 </tr>
                               ))}
                               {historyStudentStats.length === 0 && (
                                 <tr><td colSpan={4} className="p-4 text-center text-gray-500">No students found.</td></tr>
                               )}
                             </tbody>
                           </table>
                         </div>
                      ) : (
                        <div className="space-y-4">
                           {historySessions.length === 0 ? (
                             <div className="text-center py-8 text-gray-500">No sessions recorded yet.</div>
                           ) : (
                             historySessions.map((session, idx) => (
                               <div 
                                 key={idx} 
                                 onClick={() => setViewSessionDate(session.date)}
                                 className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer group relative"
                               >
                                  <div className="flex justify-between items-center mb-2">
                                     <div>
                                        <p className="font-semibold text-gray-900">{session.date}</p>
                                        <p className="text-xs text-gray-500">{session.totalStudents} Students assigned</p>
                                     </div>
                                     <div className="text-right">
                                        <span className="block text-2xl font-bold text-indigo-600">{session.present}</span>
                                        <span className="text-xs text-gray-500 uppercase font-medium">Present</span>
                                     </div>
                                  </div>
                                  {/* Mini bar for session */}
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                                    <div 
                                      className="bg-indigo-600 h-1.5 rounded-full" 
                                      style={{ width: `${(session.present / Math.max(session.totalStudents, 1)) * 100}%` }}
                                    ></div>
                                  </div>
                                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                  </div>
                               </div>
                             ))
                           )}
                        </div>
                      )}
                   </Card>
                 </div>

                 {/* Right: Overview Stats */}
                 <div className="lg:col-span-1 space-y-6">
                    <Card title="Subject Overview">
                       <div className="text-center py-4">
                          <p className="text-4xl font-extrabold text-indigo-600">{historySessions.length}</p>
                          <p className="text-sm text-gray-500 mt-1">Total Classes Held</p>
                       </div>
                       <div className="border-t border-gray-100 pt-4 text-center">
                          <p className="text-4xl font-extrabold text-green-600">
                            {historySessions.length > 0 
                              ? Math.round(historySessions.reduce((acc, s) => acc + (s.present / Math.max(s.totalStudents, 1)), 0) / historySessions.length * 100)
                              : 0}%
                          </p>
                          <p className="text-sm text-gray-500 mt-1">Avg. Class Attendance</p>
                       </div>
                    </Card>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                       <h4 className="font-semibold text-blue-900 mb-2 text-sm">Top Attendees</h4>
                       <ul className="space-y-2">
                          {historyStudentStats
                            .sort((a, b) => b.percentage - a.percentage)
                            .slice(0, 3)
                            .map(s => (
                              <li key={s.id} className="flex justify-between text-sm">
                                <span className="text-blue-800">{s.name}</span>
                                <span className="font-bold text-blue-600">{s.percentage}%</span>
                              </li>
                            ))
                          }
                          {historyStudentStats.length === 0 && <li className="text-xs text-blue-400">No data available</li>}
                       </ul>
                    </div>

                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                       <h4 className="font-semibold text-red-900 mb-2 text-sm">Low Attendance Warning</h4>
                       <ul className="space-y-2">
                          {historyStudentStats
                            .filter(s => s.percentage < 75 && s.totalSessions > 0)
                            .sort((a, b) => a.percentage - b.percentage)
                            .slice(0, 3)
                            .map(s => (
                              <li key={s.id} className="flex justify-between text-sm">
                                <span className="text-red-800">{s.name}</span>
                                <span className="font-bold text-red-600">{s.percentage}%</span>
                              </li>
                            ))
                          }
                          {historyStudentStats.filter(s => s.percentage < 75 && s.totalSessions > 0).length === 0 && (
                            <li className="text-xs text-red-400">Everyone is above 75%!</li>
                          )}
                       </ul>
                    </div>
                 </div>
               </div>
             )}
           </div>
        )}

        {/* Modal for Session Details */}
        {viewSessionDate && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Session Details</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(viewSessionDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <button onClick={() => setViewSessionDate(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div className="p-0 overflow-y-auto flex-1">
                         <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-200 bg-white">
                                {sessionDetails?.map(s => (
                                    <tr key={s.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.rollNo}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${s.status === 'PRESENT' ? 'bg-green-100 text-green-800' : s.status === 'ABSENT' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(!sessionDetails || sessionDetails.length === 0) && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No attendance records found for this date.</td>
                                    </tr>
                                )}
                             </tbody>
                         </table>
                    </div>
                     <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
                        <Button onClick={() => setViewSessionDate(null)}>Close</Button>
                    </div>
                </div>
            </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;