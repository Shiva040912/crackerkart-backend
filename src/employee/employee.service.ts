import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import {
  Employee,
  EmployeeDocument,
} from './employee.schema';

type CreateEmployeeData = {
  name: string;
  age: number;
  phone: string;
  email: string;
  password: string;
  department: string;
};

type UpdateEmployeeData = Partial<{
  name: string;
  age: number;
  phone: string;
  email: string;
  password: string;
  department: string;
  isActive: boolean;
}>;

@Injectable()
export class EmployeeService implements OnModuleInit {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  async onModuleInit() {
    await this.createDefaultSuperAdmin();
  }

  private async createDefaultSuperAdmin() {
    const email = (
      process.env.SUPER_ADMIN_EMAIL ||
      'superadmin@japanpattasu.com'
    )
      .trim()
      .toLowerCase();

    const password =
      process.env.SUPER_ADMIN_PASSWORD || 'Super@123';

    const existingSuperAdmin =
      await this.employeeModel.findOne({
        email,
      });

    if (existingSuperAdmin) {
      return;
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10,
    );

    await this.employeeModel.create({
      name: 'Super Admin',
      age: 25,
      phone: '9999999999',
      email,
      password: hashedPassword,
      department: 'super_admin',
      isActive: true,
    });

    console.log(
      `Default Super Admin created: ${email}`,
    );
  }

  async create(data: CreateEmployeeData) {
    const email = data.email
      .trim()
      .toLowerCase();

    const phone = data.phone.trim();

    const existingEmail =
      await this.employeeModel.findOne({
        email,
      });

    if (existingEmail) {
      throw new ConflictException(
        'Email already exists',
      );
    }

    const existingPhone =
      await this.employeeModel.findOne({
        phone,
      });

    if (existingPhone) {
      throw new ConflictException(
        'Phone number already exists',
      );
    }

    const hashedPassword =
      await bcrypt.hash(data.password, 10);

    const employee =
      await this.employeeModel.create({
        name: data.name.trim(),
        age: Number(data.age),
        phone,
        email,
        password: hashedPassword,
        department: data.department,
        isActive: true,
      });

    return {
      message: 'Employee created successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        age: employee.age,
        phone: employee.phone,
        email: employee.email,
        department: employee.department,
        isActive: employee.isActive,
      },
    };
  }

  async findByEmail(email: string) {
    return this.employeeModel.findOne({
      email: email.trim().toLowerCase(),
      isActive: true,
    });
  }

  async findAll() {
    const employees = await this.employeeModel
      .find()
      .select('-password')
      .sort({
        createdAt: -1,
      });

    return {
      message: 'Employees fetched successfully',
      totalEmployees: employees.length,
      employees,
    };
  }

  async findById(id: string) {
    const employee =
      await this.employeeModel
        .findById(id)
        .select('-password');

    if (!employee) {
      throw new NotFoundException(
        'Employee not found',
      );
    }

    return employee;
  }

  async update(
    id: string,
    data: UpdateEmployeeData,
  ) {
    const employee =
      await this.employeeModel.findById(id);

    if (!employee) {
      throw new NotFoundException(
        'Employee not found',
      );
    }

    if (data.email) {
      const email = data.email
        .trim()
        .toLowerCase();

      const duplicateEmail =
        await this.employeeModel.findOne({
          email,
          _id: {
            $ne: employee._id,
          },
        });

      if (duplicateEmail) {
        throw new ConflictException(
          'Email already exists',
        );
      }

      employee.email = email;
    }

    if (data.phone) {
      const phone = data.phone.trim();

      const duplicatePhone =
        await this.employeeModel.findOne({
          phone,
          _id: {
            $ne: employee._id,
          },
        });

      if (duplicatePhone) {
        throw new ConflictException(
          'Phone number already exists',
        );
      }

      employee.phone = phone;
    }

    if (data.name !== undefined) {
      employee.name = data.name.trim();
    }

    if (data.age !== undefined) {
      employee.age = Number(data.age);
    }

    if (data.department !== undefined) {
      employee.department = data.department;
    }

    if (data.isActive !== undefined) {
      employee.isActive = data.isActive;
    }

    if (data.password) {
      employee.password = await bcrypt.hash(
        data.password,
        10,
      );
    }

    await employee.save();

    return {
      message: 'Employee updated successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        age: employee.age,
        phone: employee.phone,
        email: employee.email,
        department: employee.department,
        isActive: employee.isActive,
      },
    };
  }

  async delete(id: string) {
    const employee =
      await this.employeeModel.findById(id);

    if (!employee) {
      throw new NotFoundException(
        'Employee not found',
      );
    }

    if (
      employee.department === 'super_admin'
    ) {
      throw new ConflictException(
        'Super Admin cannot be deleted',
      );
    }

    await employee.deleteOne();

    return {
      message: 'Employee deleted successfully',
    };
  }
}