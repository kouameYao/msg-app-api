import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { Prisma } from '@prisma/client';
import { buildTaskWhereInput } from './utils/task-filter.util';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createTaskDto: CreateTaskDto) {
    const { assignedUserId, ...taskData } = createTaskDto;
    
    // Validate functionality is implicitly handled by foreign key constraints, 
    // but explicit check or try/catch could be added if customized error needed.
    
    const task = await this.prisma.task.create({
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

    await this.clearListCache();
    return task;
  }

  async findAll(filterDto: TaskFilterDto) {
    const { status, assignedUserId, dueDate, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    const where = buildTaskWhereInput(filterDto);

    const key = `tasks:list:${JSON.stringify(filterDto)}`;
    const cached = await this.cacheManager.get(key);
    
    if (cached) {
      return cached;
    }

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

    const result = {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.cacheManager.set(key, result);
    return result;
  }

  async findOne(id: string) {
    const key = `tasks:detail:${id}`;
    const cached = await this.cacheManager.get(key);
    if (cached) {
      return cached;
    }

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

    await this.cacheManager.set(key, task);
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

    const updatedTask = await this.prisma.task.update({
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

    await this.cacheManager.del(`tasks:detail:${id}`);
    await this.clearListCache();

    return updatedTask;
  }

  async remove(id: string) {
    await this.findOne(id);
    const deleted = await this.prisma.task.delete({ where: { id } });
    await this.cacheManager.del(`tasks:detail:${id}`);
    await this.clearListCache();
    return deleted;
  }

  private async clearListCache() {
    const store = (this.cacheManager as any).store;
    if (store.keys && store.del) {
      const keys = await store.keys('tasks:list:*');
      if (keys.length > 0) {
        await store.del(keys);
      }
    }
  }
}
