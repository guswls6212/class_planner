/**
 * 🔄 Application Layer - 통합 Export
 *
 * 애플리케이션 레이어의 모든 유스케이스, 서비스, 매퍼를 통합하여 export합니다.
 */

// ===== Use Cases =====
export { AddStudentUseCase } from './use-cases/AddStudentUseCase';
export { DeleteStudentUseCase } from './use-cases/DeleteStudentUseCase';
export { GetStudentUseCase } from './use-cases/GetStudentUseCase';
export { UpdateStudentUseCase } from './use-cases/UpdateStudentUseCase';

export {
  AddSubjectUseCase,
  DeleteSubjectUseCase,
  GetSubjectUseCase,
  UpdateSubjectUseCase,
} from './use-cases/SubjectUseCases';

// ===== Application Services =====
export {
  StudentApplicationService,
  StudentApplicationServiceImpl,
} from './services/StudentApplicationService';

// ===== Mappers =====
export { StudentMapper } from './mappers/StudentMapper';
export { SubjectMapper } from './mappers/SubjectMapper';

// ===== 타입 재export =====
export type {
  AddStudentRequest,
  AddStudentResponse,
  DeleteStudentRequest,
  DeleteStudentResponse,
  GetAllStudentsRequest,
  GetAllStudentsResponse,
  GetStudentRequest,
  GetStudentResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
} from './use-cases/AddStudentUseCase';

export type {
  AddSubjectRequest,
  AddSubjectResponse,
  DeleteSubjectRequest,
  DeleteSubjectResponse,
  GetAllSubjectsRequest,
  GetAllSubjectsResponse,
  GetSubjectRequest,
  GetSubjectResponse,
  UpdateSubjectRequest,
  UpdateSubjectResponse,
} from './use-cases/SubjectUseCases';
