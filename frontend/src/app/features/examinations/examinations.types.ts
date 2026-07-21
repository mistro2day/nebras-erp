/**
 * أنواع موديول الامتحانات — تُغني عن استخدام any وتوثّق شكل بيانات الـ API.
 * الردود تتبع StandardResponse: { success, message?, data }.
 */
export interface ApiResp<T> { success: boolean; message?: string; data: T; }

export interface ExamCategory { id: string; name: string; code: string; description?: string; }
export interface ExamType { id: string; name: string; code: string; type_class: string; description?: string; }
export interface ExamRoom { id: string; name: string; code: string; capacity: number; description?: string; }

export interface Exam {
  id: string; name: string; code: string; description?: string;
  subject_id: string; academic_year: string; term: string;
  category: string; exam_type: string;
  max_marks: number; pass_marks: number; weight_percentage: number;
  status: string;
}

export interface ExamSession { id: string; name: string; code: string; start_date: string; end_date: string; is_active: boolean; }
export interface ExamSchedule { id: string; exam: string; session: string; exam_date: string; start_time: string; end_time: string; duration_minutes: number; }

export interface QuestionBank { id: string; name: string; subject_id: string; description?: string; }
export interface Question { id: string; bank: string; question_type: string; content: string; marks: number; difficulty_level: string; bloom_taxonomy?: string; is_active: boolean; }

export interface Assessment { id: string; name: string; subject_id: string; academic_year: string; max_marks: number; }
export interface AssessmentItem { id: string; assessment: string; name: string; max_marks: number; weight_percentage: number; }
export interface AssessmentWeight { id: string; subject_id: string; academic_year: string; continuous_assessment_weight: number; final_exam_weight: number; }

export interface GradingScheme { id: string; name: string; code: string; is_active: boolean; }
export interface GradeScale { id: string; scheme: string; grade_letter: string; gpa_value: number; min_percentage: number; max_percentage: number; color?: string; }

export interface StudentExam { id: string; schedule: string; student_id: string; room: string; seat_number?: string; }
export interface ExamAppeal { id: string; student_exam: string; reason: string; status: string; old_marks: number; new_marks?: number | null; }
export interface ExamIncident { id: string; student_exam: string; incident_type: string; description: string; action_taken?: string; }

export interface ExamResult {
  id: string; student_id: string; subject_id: string; academic_year: string; term: string;
  exam_marks: number; assessment_marks: number; total_marks: number;
  grade_letter?: string; gpa_value: number; is_passed: boolean;
}
export interface Transcript { id: string; student_id: string; academic_year: string; cgpa: number; total_credits: number; is_locked: boolean; }
export interface AcademicStanding { id: string; student_id: string; academic_year: string; term: string; standing: string; remarks?: string; }

// ---- مرجعيات من موديولات أخرى ----
export interface Subject { id: string; code: string; arabic_name: string; english_name?: string; }
export interface AcademicYear { id: string; name: string; code: string; current_flag?: boolean; }
export interface Term { id: string; name: string; code: string; academic_year: string; }
export interface Grade { id: string; name: string; code: string; }
export interface Section { id: string; grade: string; name: string; code: string; }

export interface StudentEnrollment { section_id?: string; grade_id?: string; academic_year_id?: string; status?: string; }
export interface StudentProfile { arabic_name?: string; english_name?: string; }
export interface Student { id: string; student_number?: string; profile?: StudentProfile; enrollments?: StudentEnrollment[]; }

/** صف كشف الرصد — StudentExam مع حقول واجهة مؤقتة. */
export interface RosterRow extends StudentExam { tempMark: number | null; present: boolean; saving: boolean; }
