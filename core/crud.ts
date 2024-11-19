console.log("CRUD START");
import fs from "fs";
import crypto from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const DB_FILE_PATH = "./core/db";

const notFoundError = '{ status: 404, message: "Not found To Do" }';

type UUID = string;
type jwt = string;
type DateInString = string;

interface IToDo {
  userID: string;
  id: UUID;
  content: string;
  createdAt: DateInString;
  isDone: boolean;
  updatedAt: DateInString;
}

interface IUser {
  password: string;
  salt: string;
  id: string;
}

interface ITokens {
  accessToken: jwt;
  refreshToken: jwt;
}

interface IDB {
  toDos: IToDo[];
  users: IUser[];
}

function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return btoa(String.fromCharCode(...salt));
}

function createHash(info: string, salt: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(info)
    .update(salt)
    .digest("hex");
  return hash;
}

function verifyString(str: string, min?: number, max?: number): void {
  if (
    !str ||
    typeof str !== "string" ||
    str.trim() === "" ||
    (min && str.length < min) ||
    (max && str.length > max)
  ) {
    throw new Error("Invalid props");
  }
}

function generateTokens(id: string): ITokens {
  const payload = { id };
  const refreshKey = process.env.REFRESH_KEY;
  const accessKey = process.env.ACCESS_KEY;

  if (!refreshKey || !accessKey) throw new Error("MISSING KEYS");

  const accessToken = jwt.sign(payload, accessKey, { expiresIn: "60s" });
  const refreshToken = jwt.sign(payload, refreshKey, { expiresIn: "7 days" });

  return { accessToken, refreshToken };
}

function verifyToken(type: "access" | "refresh", token: string) {
  const key =
    type === "access" ? process.env.ACCESS_KEY : process.env.REFRESH_KEY;

  if (!key) throw new Error("MISSING KEYS");

  jwt.verify(token, key, (err) => {
    if (err) throw new Error("Invalid Token:" + err);
  });
  const decodedToken = jwt.decode(token) as JwtPayload;

  return decodedToken.id;
}

function validateUserPassword(user: IUser, password: string) {
  const hashedPassword = createHash(password, user.salt);
  if (hashedPassword !== user.password) throw new Error("ACCESS DENIED");
}

function getUserByID(id: string) {
  const db = getDB();
  const userIndex = db.users.findIndex((userInTest) => userInTest.id === id);

  if (userIndex === -1) throw new Error(notFoundError);

  return { user: db.users[userIndex], index: userIndex };
}

function getTokens(credentials: { id: string; password: string } | string) {
  if (typeof credentials === "string") {
    const id = verifyToken("refresh", credentials);

    getUserByID(id);

    return generateTokens(id);
  }

  const { user } = getUserByID(credentials.id);

  validateUserPassword(user, credentials.password);

  return generateTokens(credentials.id);
}

function createUser(id: string, password: string): ITokens {
  verifyString(id, 3, 8);
  verifyString(password, 8);

  try {
    getUserByID(id);
  } catch (err) {
    const db = getDB();

    const salt = generateSalt();
    const hashedPassword = createHash(password, salt);
    const newUser: IUser = {
      id,
      password: hashedPassword,
      salt,
    };

    db.users.push(newUser);
    updateDB(db);

    return generateTokens(id);
  }
  throw new Error("this id is already in use");
}

function getDB(): IDB {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE_PATH).toString());
    if (!db.toDos || !Array.isArray(db.toDos))
      throw new Error("DB not compatible");
    return db;
  } catch (error) {
    return NEW_DB();
  }
}

function updateDB(data: IDB): void {
  if (typeof data !== "object") throw new Error("the DB must be a json object");
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
}

function NEW_DB(): IDB {
  const newDB = { toDos: [], users: [] };

  updateDB(newDB);
  return newDB;
}

function createToDo(content: string, accessToken: string): IToDo {
  verifyString(content);
  const userID = verifyToken("access", accessToken);

  const toDo: IToDo = {
    userID,
    id: crypto.randomUUID(),
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDone: false,
  };

  const db = getDB();

  db.toDos.push(toDo);
  updateDB(db);

  return toDo;
}

function readAllToDos(accessToken: string): IToDo[] {
  const userID = verifyToken("access", accessToken);

  const db = getDB();
  const toDos = db.toDos.filter((toDoInTest) => toDoInTest.userID === userID);

  return toDos;
}

function findToDoById(id: string, accessToken: string): IToDo | null {
  const userID = verifyToken("access", accessToken);

  const db = getDB();

  const toDoSelected = db.toDos.find((toDo: IToDo) => toDo.id === id) || null;
  verifyToDoOwner(toDoSelected, userID);

  return toDoSelected;
}

function verifyToDoOwner(toDo: IToDo | null, userID: string) {
  if (toDo && toDo.userID !== userID) throw new Error("ACCESS DENIED");
}

function updateToDo(
  id: string,
  toDoUpdates: Partial<IToDo>,
  accessToken: string
): IToDo {
  if (toDoUpdates.id || toDoUpdates.createdAt || toDoUpdates.userID)
    throw new Error("you can't update the id, userID and createdAt field");

  const userID = verifyToken("access", accessToken);

  const db = getDB();
  const toDoSelected = db.toDos.findIndex((toDo: IToDo) => toDo.id === id);

  if (toDoSelected === -1) throw new Error(notFoundError);

  const currentToDo = db.toDos[toDoSelected];
  verifyToDoOwner(currentToDo, userID);
  const updatedToDo: IToDo = {
    ...currentToDo,
    ...toDoUpdates,
    updatedAt: new Date().toISOString(),
  };

  db.toDos[toDoSelected] = updatedToDo;
  updateDB(db);

  return updatedToDo;
}

function changeIsDoneById(id: string, accessToken: string): IToDo {
  const userID = verifyToken("access", accessToken);

  const db = getDB();
  const toDoIndex = db.toDos.findIndex((toDo: IToDo) => toDo.id === id);

  if (toDoIndex === -1) throw new Error(notFoundError);

  const currentToDo = db.toDos[toDoIndex];
  verifyToDoOwner(currentToDo, userID);
  const updatedToDo: IToDo = {
    ...currentToDo,
    isDone: !currentToDo.isDone,
    updatedAt: new Date().toISOString(),
  };

  db.toDos[toDoIndex] = updatedToDo;
  updateDB(db);

  return updatedToDo;
}

function updateContentById(
  id: string,
  content: string,
  accessToken: string
): IToDo {
  return updateToDo(id, { content }, accessToken);
}

function deleteToDoById(id: string, accessToken: string) {
  const toDo = findToDoById(id, accessToken);

  if (!toDo) throw new Error(notFoundError);

  const db = getDB();
  db.toDos = db.toDos.filter((toDoInTest) => toDoInTest.id !== toDo.id);
  updateDB(db);
}

//test
NEW_DB();

const user = createUser("DANIEL", "12345678");

createToDo("TEST 1", user.accessToken);
const toDo = createToDo("TEST 2", user.accessToken);
console.log(readAllToDos(user.accessToken));

deleteToDoById(toDo.id, user.accessToken);
console.log(readAllToDos(user.accessToken));
