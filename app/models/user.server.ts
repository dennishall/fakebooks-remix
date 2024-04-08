import type { Password, User } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "~/db.server";

export type { User } from "@prisma/client";

export async function getUserById(id: User["id"]) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User["email"]) {
  return prisma.user.findUnique({ where: { email } });
}

export async function getAllUsers() {
  return prisma.user.findMany();
}

export async function createUser(
    {
      email,
      password,
      name,
      phone,
      hourlyRate,
      street,
      city,
      state,
      country,
      postalCode,
    }: User
  ) {

  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      name,
      phone,
      hourlyRate,
      street,
      city,
      state,
      country,
      postalCode,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });
}

// let's hold off w/passwords for now.
export async function updateUser(
    {
        email,
        // password,
        name,
        phone,
        hourlyRate,
        street,
        city,
        state,
        country,
        postalCode,
    }: User
) {

    // const hashedPassword = await bcrypt.hash(password, 10);

    return prisma.user.create({
        data: {
            email,
            name,
            phone,
            hourlyRate,
            street,
            city,
            state,
            country,
            postalCode,
            // password: {
            //     create: {
            //         hash: hashedPassword,
            //     },
            // },
        },
    });
}

export async function deleteUserByEmail(email: User["email"]) {
  return prisma.user.delete({ where: { email } });
}

export async function verifyLogin(
  email: User["email"],
  password: Password["hash"]
) {
  const userWithPassword = await prisma.user.findUnique({
    where: { email },
    include: {
      password: true,
    },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(
    password,
    userWithPassword.password.hash
  );

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}
