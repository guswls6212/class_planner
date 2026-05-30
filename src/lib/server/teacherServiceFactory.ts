import { ServiceFactory } from "@/application/services/ServiceFactory";

export function getTeacherService() {
  return ServiceFactory.createTeacherService();
}
