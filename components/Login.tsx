import React, { useState } from 'react';
import { Student, UserRole } from '../types';
import { Button, Input, Card } from './ui';

interface LoginProps {
  onLogin: (role: UserRole, student?: Student) => void;
  students: Student[];
  onPasswordReset?: (studentId: string, newPass: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, students, onPasswordReset }) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'cr'>('admin');
  // Pre-fill credentials for easier demo access
  const [adminUser, setAdminUser] = useState('admin');
  const [adminPass, setAdminPass] = useState('admin');
  
  const [crRollNo, setCrRollNo] = useState('');
  const [crPassword, setCrPassword] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password Reset State
  const [isResetting, setIsResetting] = useState(false);
  const [resetStep, setResetStep] = useState<'identify' | 'method' | 'verify_email' | 'verify_qa' | 'reset'>('identify');
  const [resetRollNo, setResetRollNo] = useState('');
  
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  
  const [resetCode, setResetCode] = useState('');
  const [serverCode, setServerCode] = useState('');
  
  const [qaAnswer, setQaAnswer] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser === 'admin' && adminPass === 'admin') {
      onLogin('ADMIN');
    } else {
      setError('Invalid Admin Credentials (try admin/admin)');
    }
  };

  const handleCRLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.rollNo === crRollNo);
    if (student) {
      if (student.isCR) {
        // Validate password
        // Logic: If student has password set, check it. 
        // If no password set (legacy/error), fallback to '12345' as default for testing
        const validPassword = student.password ? (student.password === crPassword) : (crPassword === '12345');
        
        if (validPassword) {
           onLogin('CR', student);
        } else {
           setError('Invalid Password');
        }
      } else {
        setError('Access Denied. You are not assigned as a Class Representative.');
      }
    } else {
      setError('Student not found. Please contact Admin to register.');
    }
  };

  // --- Password Reset Handlers ---

  const startReset = () => {
    setIsResetting(true);
    setResetStep('identify');
    setError('');
    setSuccessMsg('');
    setResetRollNo('');
    setFoundStudent(null);
  };

  const cancelReset = () => {
    setIsResetting(false);
    setError('');
    setSuccessMsg('');
  };

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.rollNo === resetRollNo);
    
    if (!student) {
      setError('Student not found with this Roll Number.');
      return;
    }

    if (!student.isCR) {
      setError('Only Class Representatives can reset passwords.');
      return;
    }

    if (!student.email && !student.securityQuestion) {
      setError('No recovery methods (Email or Security Question) set. Please contact Admin.');
      return;
    }

    setFoundStudent(student);
    setResetStep('method');
    setError('');
  };

  const handleMethodSelect = (method: 'email' | 'qa') => {
    setError('');
    if (method === 'email') {
      if (!foundStudent?.email) return;
      
      // Simulate Email Code
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setServerCode(code);
      setResetCode('');
      
      alert(`[SIMULATION] Your Verification Code sent to ${foundStudent.email} is: ${code}`);
      setResetStep('verify_email');
    } else {
      if (!foundStudent?.securityQuestion) return;
      setQaAnswer('');
      setResetStep('verify_qa');
    }
  };

  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode !== serverCode) {
      setError('Invalid Verification Code.');
      return;
    }
    setResetStep('reset');
    setError('');
  };

  const handleVerifyQA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundStudent?.securityAnswer) {
      setError('Security answer not set on account.');
      return;
    }
    
    if (qaAnswer.trim().toLowerCase() !== foundStudent.securityAnswer.trim().toLowerCase()) {
      setError('Incorrect answer.');
      return;
    }
    setResetStep('reset');
    setError('');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (onPasswordReset && foundStudent) {
      onPasswordReset(foundStudent.id, newPassword);
      setIsResetting(false);
      setError('');
      setSuccessMsg('Password reset successfully! Please login.');
      // Pre-fill login
      setCrRollNo(foundStudent.rollNo);
      setCrPassword('');
      setActiveTab('cr');
    }
  };

  // Helper to mask email
  const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    const maskedName = name.length > 2 ? name.substring(0, 2) + '*'.repeat(name.length - 2) : name;
    return `${maskedName}@${domain}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">UniTrack</h1>
          <p className="text-gray-500">Attendance Management System</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center gap-2">
             <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             {error}
          </div>
        )}
        
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-md flex items-center gap-2">
             <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
             {successMsg}
          </div>
        )}

        {isResetting ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                Reset Password
              </h2>
              <button onClick={cancelReset} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            {/* Step 1: Identify Account */}
            {resetStep === 'identify' && (
              <form onSubmit={handleIdentify} className="space-y-4">
                <p className="text-sm text-gray-500 mb-2">Enter your Roll Number to find your account.</p>
                <Input 
                  label="Roll Number" 
                  value={resetRollNo} 
                  onChange={e => setResetRollNo(e.target.value)}
                  placeholder="e.g. CS2023001"
                  required
                />
                <div className="flex gap-2 pt-2">
                   <Button type="button" variant="secondary" className="flex-1" onClick={cancelReset}>Back</Button>
                   <Button type="submit" className="flex-1">Find Account</Button>
                </div>
              </form>
            )}

            {/* Step 2: Select Method */}
            {resetStep === 'method' && foundStudent && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 mb-2">Select a verification method for <strong>{foundStudent.name}</strong>:</p>
                
                {foundStudent.email ? (
                  <button 
                    onClick={() => handleMethodSelect('email')}
                    className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left group"
                  >
                    <div className="p-2 bg-indigo-100 rounded-full text-indigo-600 mr-4 group-hover:bg-indigo-600 group-hover:text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Email Verification</p>
                      <p className="text-xs text-gray-500">Send code to {maskEmail(foundStudent.email)}</p>
                    </div>
                  </button>
                ) : (
                   <div className="p-3 bg-gray-50 rounded text-xs text-gray-500 italic text-center">No email linked to this account.</div>
                )}

                {foundStudent.securityQuestion ? (
                   <button 
                    onClick={() => handleMethodSelect('qa')}
                    className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-all text-left group"
                  >
                    <div className="p-2 bg-purple-100 rounded-full text-purple-600 mr-4 group-hover:bg-purple-600 group-hover:text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Security Question</p>
                      <p className="text-xs text-gray-500">Answer your secret question</p>
                    </div>
                  </button>
                ) : (
                  <div className="p-3 bg-gray-50 rounded text-xs text-gray-500 italic text-center">No security question set.</div>
                )}

                <Button variant="secondary" onClick={() => setResetStep('identify')} className="w-full mt-2">Back</Button>
              </div>
            )}

            {/* Step 3a: Verify Email Code */}
            {resetStep === 'verify_email' && (
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <p className="text-sm text-gray-500 mb-2">We sent a code to <strong>{foundStudent && maskEmail(foundStudent.email || '')}</strong>.</p>
                <Input 
                  label="Verification Code" 
                  value={resetCode} 
                  onChange={e => setResetCode(e.target.value)}
                  placeholder="e.g. 1234"
                  required
                />
                <div className="flex gap-2 pt-2">
                   <Button type="button" variant="secondary" className="flex-1" onClick={() => setResetStep('method')}>Back</Button>
                   <Button type="submit" className="flex-1">Verify</Button>
                </div>
              </form>
            )}

            {/* Step 3b: Verify Security Question */}
            {resetStep === 'verify_qa' && foundStudent && (
              <form onSubmit={handleVerifyQA} className="space-y-4">
                 <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4">
                    <p className="text-xs text-purple-600 uppercase font-bold mb-1">Security Question</p>
                    <p className="text-gray-900 font-medium">{foundStudent.securityQuestion}</p>
                 </div>
                <Input 
                  label="Your Answer" 
                  value={qaAnswer} 
                  onChange={e => setQaAnswer(e.target.value)}
                  placeholder="Enter answer"
                  type="password"
                  required
                />
                <div className="flex gap-2 pt-2">
                   <Button type="button" variant="secondary" className="flex-1" onClick={() => setResetStep('method')}>Back</Button>
                   <Button type="submit" className="flex-1">Verify</Button>
                </div>
              </form>
            )}

            {/* Step 4: Reset Password */}
            {resetStep === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 bg-green-50 text-green-700 rounded text-sm mb-4">Identity verified. Set a new password.</div>
                <Input 
                  label="New Password" 
                  type="password"
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  required
                />
                <Input 
                  label="Confirm Password" 
                  type="password"
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  required
                />
                <div className="flex gap-2 pt-2">
                   <Button type="button" variant="secondary" className="flex-1" onClick={cancelReset}>Cancel</Button>
                   <Button type="submit" className="flex-1">Reset Password</Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <>
            <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
              <button 
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'admin' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => { setActiveTab('admin'); setError(''); setSuccessMsg(''); }}
              >
                Admin Login
              </button>
              <button 
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'cr' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => { setActiveTab('cr'); setError(''); setSuccessMsg(''); }}
              >
                CR Login
              </button>
            </div>

            {activeTab === 'admin' ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <Input 
                  label="Username" 
                  value={adminUser} 
                  onChange={e => setAdminUser(e.target.value)}
                  placeholder="admin"
                />
                <Input 
                  label="Password" 
                  type="password" 
                  value={adminPass} 
                  onChange={e => setAdminPass(e.target.value)}
                  placeholder="admin"
                />
                <Button type="submit" className="w-full">Sign In as Admin</Button>
                <p className="text-xs text-center text-gray-400 mt-2">Credentials: admin / admin</p>
              </form>
            ) : (
              <form onSubmit={handleCRLogin} className="space-y-4">
                 <div className="bg-yellow-50 p-3 rounded-md mb-4 text-xs text-yellow-800">
                   <strong>Note:</strong> Please log in as Admin first to add students and assign a Class Representative.
                </div>
                <Input 
                  label="Student Roll Number" 
                  value={crRollNo} 
                  onChange={e => setCrRollNo(e.target.value)}
                  placeholder="e.g. CS2023001"
                />
                <div className="space-y-1">
                  <Input 
                    label="Password" 
                    type="password"
                    value={crPassword} 
                    onChange={e => setCrPassword(e.target.value)}
                    placeholder="Password"
                    className="mb-1"
                  />
                  <div className="flex justify-end">
                    <button type="button" onClick={startReset} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                      Forgot Password?
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full">Sign In as CR</Button>
              </form>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default Login;