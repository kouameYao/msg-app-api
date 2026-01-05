import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { Prisma } from '@prisma/client';
import { buildTaskWhereInput } from './utils/task-filter.util';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto) {
    const { assignedUserId, ...taskData } = createTaskDto;
    
    // Validate functionality is implicitly handled by foreign key constraints, 
    // but explicit check or try/catch could be added if customized error needed.
    
    return this.prisma.task.create({
      data: {
        ...taskData,
        assignedUser: assignedUserId ? { connect: { id: assignedUserId } } : undefined,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(filterDto: TaskFilterDto) {
    const { status, assignedUserId, dueDate, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    const where = buildTaskWhereInput(filterDto);

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
           assignedUser: {
             select: {
               id: true,
               email: true,
             }
           }
        }
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedUser: {
            select: {
                id: true,
                email: true,
            }
        }
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    await this.findOne(id);
    
    const { assignedUserId, ...taskData } = updateTaskDto;

    const assignedUserUpdate = assignedUserId
      ? { connect: { id: assignedUserId } }
      : assignedUserId === null
        ? { disconnect: true }
        : undefined;

    return this.prisma.task.update({
      where: { id },
      data: {
        ...taskData,
        assignedUser: assignedUserUpdate,
      },
      include: {
        assignedUser: {
            select: {
                id: true,
                email: true,
            }
        }
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.task.delete({ where: { id } });
  }
}
