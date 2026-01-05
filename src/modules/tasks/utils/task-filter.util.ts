import { Prisma } from '@prisma/client';
import { TaskFilterDto } from '../dto/task-filter.dto';

export const buildTaskWhereInput = (filterDto: TaskFilterDto): Prisma.TaskWhereInput => {
  const { status, assignedUserId, dueDate } = filterDto;
  const where: Prisma.TaskWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (assignedUserId) {
    where.assignedUserId = assignedUserId;
  }

  if (dueDate) {
    where.dueDate = {
      gte: new Date(dueDate),
      lt: new Date(new Date(dueDate).setDate(new Date(dueDate).getDate() + 1)),
    };
  }

  return where;
};
