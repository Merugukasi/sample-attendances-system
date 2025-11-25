import React, { useState, useMemo } from 'react';
import { Student, Course, CourseAssignment, AttendanceRecord } from '../types';
import { Button, Card } from './ui';
import { generateAttendanceInsight } from '../services/geminiService';

interface CRDashboardProps {
  currentUser: Student;
  students: Student[];
  courses: Course[];
  assignments: CourseAssignment[];
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  onLogout: () => void;
}

const CRDashboard: React.FC<CRDashboardProps> = ({
  currentUser, students, courses, assignments, attendance, setAttendance, onLogout
}) => {
  // View State
  const [viewMode, setViewMode] = useState<'mark' | 'history'>('mark');

  // Mark Attendance State
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [insight, setInsight] = useState<string | null>(null);

  // History View State
  const [historySubjectId, setHistorySubjectId] = useState<string | null>(null);
  const [historySubView, setHistorySubView] = useState<'students' | 'sessions'>('students');
  const [viewSessionDate, setViewSessionDate] = useState<string | null>(null);

  // Filter courses assigned to the CR's specific DEGREE, DEPT, YEAR and SEMESTER
  const myCourses = useMemo(() => {
    const assignedIds = assignments
      .filter(a => 
        (a.degree === currentUser.degree || !a.degree) && // Backwards compatibility if degree is missing in old data
        a.department === currentUser.department && 
        a.year === currentUser.year && 
        a.semester === currentUser.semester
      )
      .map(a => a.courseId);
    return courses.filter(c => assignedIds.includes(c.id));
  }, [assignments, currentUser, courses]);

  // Filter students in the same degree/dept/year/semester (classmates)
  const classmates = useMemo(() => {
    return students.filter(s => 
      s.degree === currentUser.degree &&
      s.department === currentUser.department &&
      s.year === currentUser.year && 
      s.semester === currentUser.semester
    );
  }, [students, currentUser]);

  // --- ACTIONS: Mark Attendance ---

  const handleStartAttendance = (courseId: string) => {
    setSelectedCourseId(courseId);
    // Default all to present
    const initialMap: Record<string, boolean> = {};
    classmates.forEach(s => initialMap[s.id] = true);
    setAttendanceMap(initialMap);
    setInsight(null);
  };

  const toggleStudent = (studentId: string) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const handleSubmit = async () => {
    if (!selectedCourseId) return;

    const newRecords: AttendanceRecord[] = classmates.map(s => ({
      id: `att_${Date.now()}_${s.id}`,
      date: submissionDate,
      courseId: selectedCourseId,
      studentId: s.id,
      status: attendanceMap[s.id] ? 'PRESENT' : 'ABSENT',
      markedBy: currentUser.id
    }));

    setAttendance(prev => [...prev, ...newRecords]);
    
    // Generate AI Insight
    const presentCount = Object.values(attendanceMap).filter(Boolean).length;
    const courseName = courses.find(c => c.id === selectedCourseId)?.name || 'Unknown';
    
    const aiInsight = await generateAttendanceInsight(courseName, classmates.length, presentCount, submissionDate);
    setInsight(aiInsight);
  };

  // --- CALCULATIONS: History ---

  const historyStats = useMemo(() => {
    if (!historySubjectId) return { sessions: [], students: [] };
    
    // Get all records for this course
    const subjectRecords = attendance.filter(a => a.courseId === historySubjectId);
    
    // Group by Date to get Sessions
    const dates = Array.from(new Set(subjectRecords.map(r => r.date))).sort().reverse();
    
    const sessions = dates.map(date => {
        // Get records for this specific date
        const dateRecords = subjectRecords.filter(r => r.date === date);
        
        // Filter mainly for current classmates to avoid skewing data with deleted students, 
        // though strictly history should show what happened then. 
        // For simplicity, we count present/absent from the records that exist.
        const present = dateRecords.filter(r => r.status === 'PRESENT').length;
        const total = dateRecords.length;
        
        return { date, present, total };
    });

    // Student Stats
    const totalSessions = sessions.length;
    const studentStats = classmates.map(s => {
        const myRecords = subjectRecords.filter(r => r.studentId === s.id);
        const presentCount = myRecords.filter(r => r.status === 'PRESENT').length;
        const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
        
        return { 
          ...s, 
          presentCount, 
          totalSessions, 
          percentage 
        };
    }).sort((a, b) => a.rollNo.localeCompare(b.rollNo));

    return { sessions, students: studentStats };
  }, [attendance, historySubjectId, classmates]);

  // Selected Session Details
  const sessionDetails = useMemo(() => {
    if (!viewSessionDate || !historySubjectId) return null;
    
    const records = attendance.filter(a => a.courseId === historySubjectId && a.date === viewSessionDate);
    
    return classmates.map(student => {
        const record = records.find(r => r.studentId === student.id);
        return {
            ...student,
            status: record ? record.status : 'N/A'
        };
    }).sort((a, b) => a.rollNo.localeCompare(b.rollNo));
  }, [viewSessionDate, historySubjectId, attendance, classmates]);


  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="bg-indigo-900 text-white w-full md:w-72 flex-shrink-0 flex flex-col transition-all duration-300 shadow-xl z-20">
        <div className="p-6 border-b border-indigo-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">UniTrack</h1>
                <p className="text-indigo-300 text-xs">CR Portal</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-800/50">
               <p className="text-sm font-medium text-white">{currentUser.name}</p>
               <p className="text-xs text-indigo-300 mt-0.5">
                  {currentUser.degree} • {currentUser.department}
               </p>
               <p className="text-xs text-indigo-400 mt-0.5">
                  Year {currentUser.year} • Sem {currentUser.semester}
               </p>
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => { setViewMode('mark'); setHistorySubjectId(null); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              viewMode === 'mark' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <svg className={`w-5 h-5 ${viewMode === 'mark' ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="font-medium">Mark Attendance</span>
          </button>

          <button 
            onClick={() => { setViewMode('history'); setSelectedCourseId(null); setInsight(null); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              viewMode === 'history' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <svg className={`w-5 h-5 ${viewMode === 'history' ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="font-medium">View History</span>
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
                 {viewMode === 'mark' ? 'Mark Attendance' : 'Attendance Reports'}
              </h2>
              <p className="text-gray-500 mt-2">
                 {viewMode === 'mark' 
                    ? 'Select a subject below to record today\'s attendance for your class.' 
                    : 'View past attendance records, session details, and student statistics.'}
              </p>
           </header>

        {/* ================= MODE: MARK ATTENDANCE ================= */}
        {viewMode === 'mark' && (
          <>
            {!selectedCourseId ? (
              <div>
                {myCourses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <p>No courses assigned to your schedule ({currentUser.degree} - {currentUser.department} - Y{currentUser.year}/S{currentUser.semester}).</p>
                    <p className="text-xs mt-2">Please contact Admin to assign subjects.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myCourses.map(course => (
                      <div key={course.id} onClick={() => handleStartAttendance(course.id)} 
                          className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer group border-l-4 border-l-indigo-500">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                          </div>
                          <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">{course.code}</span>
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{course.name}</h3>
                        <p className="text-sm text-gray-500">Tap to take attendance</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <button onClick={() => { setSelectedCourseId(null); setInsight(null); }} className="mb-4 flex items-center text-sm text-gray-600 hover:text-indigo-600 font-medium">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                  Back to Course List
                </button>
                
                <Card className="mb-8">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 border-b pb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{courses.find(c => c.id === selectedCourseId)?.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">Course Code: <span className="font-mono text-indigo-600">{courses.find(c => c.id === selectedCourseId)?.code}</span></p>
                      <p className="text-xs text-gray-400 mt-1">Total Students: {classmates.length}</p>
                    </div>
                    <div className="mt-4 md:mt-0">
                      <label className="block text-xs text-gray-500 mb-1">Date</label>
                      <input 
                        type="date" 
                        value={submissionDate}
                        onChange={(e) => setSubmissionDate(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  {insight ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <h4 className="text-green-800 font-bold text-lg">Attendance Submitted!</h4>
                      <p className="text-green-700 mt-2 text-sm italic">"{insight}"</p>
                      <Button variant="outline" onClick={() => { setSelectedCourseId(null); setInsight(null); }} className="mt-4 text-sm bg-white hover:bg-green-50">Return to Dashboard</Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 mb-8">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-sm font-medium text-gray-500">Student List</span>
                          <div className="space-x-3">
                            <button onClick={() => {
                              const all: Record<string, boolean> = {};
                              classmates.forEach(s => all[s.id] = true);
                              setAttendanceMap(all);
                            }} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Mark All Present</button>
                            <button onClick={() => {
                              const all: Record<string, boolean> = {};
                              classmates.forEach(s => all[s.id] = false);
                              setAttendanceMap(all);
                            }} className="text-xs font-medium text-red-600 hover:text-red-800">Mark All Absent</button>
                          </div>
                        </div>

                        {classmates.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-lg">
                                No students found in this class ({currentUser.degree} {currentUser.department} Y{currentUser.year}).
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-xl p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                            {classmates.map(student => (
                                <div 
                                key={student.id} 
                                onClick={() => toggleStudent(student.id)}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all select-none ${
                                    attendanceMap[student.id] 
                                    ? 'bg-white border-l-4 border-l-green-500 border-t border-r border-b border-gray-200 shadow-sm' 
                                    : 'bg-white border-l-4 border-l-red-500 border-t border-r border-b border-gray-200 opacity-75'
                                }`}
                                >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                    attendanceMap[student.id] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {student.name.charAt(0)}
                                    </div>
                                    <div>
                                    <p className={`font-medium text-sm ${attendanceMap[student.id] ? 'text-gray-900' : 'text-gray-500'}`}>{student.name}</p>
                                    <p className="text-xs text-gray-400">{student.rollNo}</p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    attendanceMap[student.id] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                    {attendanceMap[student.id] ? 'Present' : 'Absent'}
                                </div>
                                </div>
                            ))}
                            </div>
                        )}
                      </div>
                      <Button onClick={handleSubmit} className="w-full py-3 text-lg shadow-md font-bold" disabled={classmates.length === 0}>Submit Attendance</Button>
                    </>
                  )}
                </Card>
              </div>
            )}
          </>
        )}

        {/* ================= MODE: VIEW HISTORY ================= */}
        {viewMode === 'history' && (
           <>
             {!historySubjectId ? (
                <div>
                  {myCourses.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No subjects assigned.</div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {myCourses.map(course => (
                        <div key={course.id} onClick={() => setHistorySubjectId(course.id)} 
                            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer group">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                            </div>
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">{course.code}</span>
                          </div>
                          <h3 className="font-bold text-lg text-gray-900 mb-1">{course.name}</h3>
                          <p className="text-sm text-gray-500">View History & Stats</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
             ) : (
                <div className="max-w-5xl mx-auto">
                   <button onClick={() => setHistorySubjectId(null)} className="mb-4 flex items-center text-sm text-gray-600 hover:text-indigo-600 font-medium">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    Back to History Subjects
                  </button>

                  <div className="grid lg:grid-cols-3 gap-6">
                     <div className="lg:col-span-2">
                       <Card>
                          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
                             <h3 className="text-xl font-bold text-gray-900">
                               {courses.find(c => c.id === historySubjectId)?.name}
                             </h3>
                             <div className="flex bg-gray-100 rounded-lg p-1">
                                <button 
                                  onClick={() => setHistorySubView('students')}
                                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${historySubView === 'students' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                                >
                                  Students
                                </button>
                                <button 
                                  onClick={() => setHistorySubView('sessions')}
                                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${historySubView === 'sessions' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                                >
                                  Sessions
                                </button>
                             </div>
                          </div>

                          {historySubView === 'students' ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Att. %</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Details</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {historyStats.students.map(s => (
                                    <tr key={s.id}>
                                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.rollNo}</td>
                                      <td className="px-4 py-3 text-sm text-gray-500">{s.name}</td>
                                      <td className="px-4 py-3 text-sm text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full ${s.percentage >= 75 ? 'bg-green-500' : s.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                              style={{ width: `${s.percentage}%` }}
                                            ></div>
                                          </div>
                                          <span className="font-medium text-xs w-8">{s.percentage}%</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                                         {s.presentCount}/{s.totalSessions}
                                      </td>
                                    </tr>
                                  ))}
                                  {historyStats.students.length === 0 && (
                                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">No students found.</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {historyStats.sessions.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No sessions recorded.</div>
                              ) : (
                                historyStats.sessions.map((session, idx) => (
                                  <div 
                                    key={idx} 
                                    onClick={() => setViewSessionDate(session.date)}
                                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer group relative"
                                  >
                                     <div className="flex justify-between items-center mb-2">
                                        <div>
                                           <p className="font-semibold text-gray-900">{session.date}</p>
                                           <p className="text-xs text-gray-500">Total Class Strength: {session.total}</p>
                                        </div>
                                        <div className="text-right">
                                           <span className="block text-xl font-bold text-indigo-600">{session.present}</span>
                                           <span className="text-xs text-gray-500 uppercase font-medium">Present</span>
                                        </div>
                                     </div>
                                     <div className="w-full bg-gray-200 rounded-full h-1.5">
                                       <div 
                                         className="bg-indigo-600 h-1.5 rounded-full" 
                                         style={{ width: `${(session.present / Math.max(session.total, 1)) * 100}%` }}
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

                     <div className="lg:col-span-1 space-y-6">
                        <Card title="Summary">
                           <div className="text-center py-4">
                              <p className="text-4xl font-extrabold text-indigo-600">{historyStats.sessions.length}</p>
                              <p className="text-sm text-gray-500 mt-1">Classes Conducted</p>
                           </div>
                           <div className="border-t border-gray-100 pt-4 text-center">
                              <p className="text-4xl font-extrabold text-green-600">
                                {historyStats.sessions.length > 0 
                                  ? Math.round(historyStats.sessions.reduce((acc, s) => acc + (s.present / Math.max(s.total, 1)), 0) / historyStats.sessions.length * 100)
                                  : 0}%
                              </p>
                              <p className="text-sm text-gray-500 mt-1">Average Attendance</p>
                           </div>
                        </Card>

                        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                           <h4 className="font-semibold text-red-900 mb-2 text-sm">Below 75% Warning</h4>
                           <ul className="space-y-2">
                              {historyStats.students
                                .filter(s => s.percentage < 75 && s.totalSessions > 0)
                                .slice(0, 5)
                                .map(s => (
                                  <li key={s.id} className="flex justify-between text-sm">
                                    <span className="text-red-800 truncate max-w-[120px]" title={s.name}>{s.name}</span>
                                    <span className="font-bold text-red-600">{s.percentage}%</span>
                                  </li>
                                ))
                              }
                              {historyStats.students.filter(s => s.percentage < 75 && s.totalSessions > 0).length === 0 && (
                                <li className="text-xs text-red-400">No students below 75%. Great job!</li>
                              )}
                           </ul>
                        </div>
                     </div>
                  </div>
                </div>
             )}
           </>
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

export default CRDashboard;