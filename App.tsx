import React, { useState, useEffect } from 'react';
import { Student, Course, CourseAssignment, AttendanceRecord, UserRole, INITIAL_STUDENTS, INITIAL_COURSES, INITIAL_ASSIGNMENTS } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import CRDashboard from './components/CRDashboard';

const App: React.FC = () => {
  // Global App State (In a real app, this would be in Context or Redux)
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [assignments, setAssignments] = useState<CourseAssignment[]>(INITIAL_ASSIGNMENTS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  
  // Auth State
  const [role, setRole] = useState<UserRole>(null);
  const [currentUser, setCurrentUser] = useState<Student | null>(null);

  const handleLogin = (newRole: UserRole, user?: Student) => {
    setRole(newRole);
    if (user) setCurrentUser(user);
  };

  const handleLogout = () => {
    setRole(null);
    setCurrentUser(null);
  };

  const handlePasswordReset = (studentId: string, newPass: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, password: newPass } : s));
  };

  // Render appropriate view based on role
  let content;
  if (role === 'ADMIN') {
    content = (
      <AdminDashboard 
        students={students} 
        courses={courses} 
        assignments={assignments}
        attendance={attendance}
        setStudents={setStudents}
        setCourses={setCourses}
        setAssignments={setAssignments}
        onLogout={handleLogout}
      />
    );
  } else if (role === 'CR' && currentUser) {
    content = (
      <CRDashboard 
        currentUser={currentUser}
        students={students}
        courses={courses}
        assignments={assignments}
        attendance={attendance}
        setAttendance={setAttendance}
        onLogout={handleLogout}
      />
    );
  } else {
    content = <Login onLogin={handleLogin} students={students} onPasswordReset={handlePasswordReset} />;
  }

  return (
    <>
      {content}
    </>
  );
};

export default App;