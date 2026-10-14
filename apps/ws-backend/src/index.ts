import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";
import { createServer } from "http";

const PORT = process.env.PORT || 8080;

const server = createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "healthy",
      message: "Sketcher WebSocket Server is running. Please connect using WS/WSS protocols."
    }));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

const wss = new WebSocketServer({ server });

interface User{
  ws: WebSocket;
  userId: string;
  rooms: string[];
}

const users: User[] = [];

function checkUser(token: string): string | null{
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if(typeof decoded == "string"){
      return null;
    }
    if(!decoded || !(decoded as JwtPayload).userId){
      return null;
    }
    return (decoded as JwtPayload).userId;
  } catch(e) {
    return null;
  }
}

wss.on("connection", function connection(ws, request) {
  const url = request.url;
  if(!url){
    return;
  }
  const queryParams = new URLSearchParams(url.split('?')[1]);
  const token = queryParams.get('token') || "";
  console.log(`[WS] New connection attempt with token: ${token ? (token.substring(0, 15) + "...") : "none"}`);
  const userId = checkUser(token);

  if(userId == null){
    console.warn(`[WS] Connection rejected: Token verification failed for token: ${token ? (token.substring(0, 15) + "...") : "none"}`);
    ws.close(4001, "Token verification failed");  
    return null;
  }

  console.log(`[WS] Connection authenticated successfully. User ID: ${userId}`);

  users.push({
    userId,
    rooms: [],
    ws

  })
  
async function resolveNumericRoomId(roomIdStr: string, fallbackUserId?: number): Promise<number | null> {
  const numericId = parseInt(roomIdStr);
  if (!isNaN(numericId)) {
    return numericId;
  }
  try {
    const existing = await prismaClient.room.findFirst({ where: { slug: roomIdStr } });
    if (existing) return existing.id;
    if (fallbackUserId && !isNaN(fallbackUserId)) {
      try {
        const created = await prismaClient.room.create({
          data: { slug: roomIdStr, adminId: fallbackUserId }
        });
        return created.id;
      } catch (e) {
        const race = await prismaClient.room.findFirst({ where: { slug: roomIdStr } });
        if (race) return race.id;
      }
    }
  } catch (err) {
    console.error(`[WS] Error resolving room slug "${roomIdStr}":`, err);
  }
  return null;
}

  ws.on("message", async function message(data) {
    let parsedData: any;
    try {
      parsedData = JSON.parse(data as unknown as string);
    } catch (e) {
      console.error("[WS] Failed to parse incoming message:", e);
      return;
    }

    if (parsedData.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    if (parsedData.type == "join") {
      const user = users.find(x => x.ws == ws);
      const rawRoomId = String(parsedData.roomId || "").trim();
      if (user && rawRoomId) {
        if (!user.rooms.includes(rawRoomId)) {
          user.rooms.push(rawRoomId);
        }
        console.log(`[WS] User ${userId} joined room ${rawRoomId}`);

        // Link both numeric ID and slug so room broadcasts match regardless of client representation
        const numId = parseInt(rawRoomId);
        if (isNaN(numId)) {
          prismaClient.room.findFirst({ where: { slug: rawRoomId } })
            .then(r => {
              if (r) {
                const dbIdStr = String(r.id);
                if (!user.rooms.includes(dbIdStr)) {
                  user.rooms.push(dbIdStr);
                  console.log(`[WS] User ${userId} linked to DB roomId ${dbIdStr} for slug ${rawRoomId}`);
                }
              }
            })
            .catch(() => {});
        } else {
          prismaClient.room.findUnique({ where: { id: numId } })
            .then(r => {
              if (r && r.slug && !user.rooms.includes(r.slug)) {
                user.rooms.push(r.slug);
                console.log(`[WS] User ${userId} linked to slug ${r.slug} for DB roomId ${rawRoomId}`);
              }
            })
            .catch(() => {});
        }
      }
    }

    if (parsedData.type == "leave_room") {
      const user = users.find(x => x.ws == ws);
      if (!user) return;
      const rawRoomId = String(parsedData.roomId || "").trim();
      user.rooms = user.rooms.filter(x => x !== rawRoomId);
      console.log(`[WS] User ${userId} left room ${rawRoomId}`);
    }

    if (parsedData.type === "chat") {
      const roomId = String(parsedData.roomId || "").trim();
      const message = parsedData.message;

      // 1. Broadcast FIRST to all OTHER users — skip sender to avoid drawing shape twice
      users.forEach(user => {
        if (user.rooms.some(r => String(r).trim() === roomId) && user.ws !== ws) {
          user.ws.send(JSON.stringify({
            type: "chat",
            message,
            roomId
          }));
        }
      });

      // 2. Persist to DB in the background — DB slowness never blocks the live experience
      const numericUserId = parseInt(userId);
      resolveNumericRoomId(roomId, numericUserId).then(finalRoomId => {
        if (finalRoomId && !isNaN(numericUserId)) {
          prismaClient.chat.create({
            data: {
              message: typeof message === "string" ? message : JSON.stringify(message),
              roomId: finalRoomId,
              userId: numericUserId
            }
          })
            .then((record) => {
              console.log(`[WS] ✅ Shape saved to DB — chat.id=${record.id}, roomId=${finalRoomId}, userId=${numericUserId}`);
            })
            .catch((e) => {
              console.error(`[WS] ❌ DB write FAILED for roomId=${finalRoomId}:`, e?.message ?? e);
            });
        }
      });
    }

    if (parsedData.type === "user_text_message") {
      const roomId = String(parsedData.roomId || "").trim();
      const message = parsedData.message;
      const senderName = parsedData.senderName || "User";

      // 1. Broadcast text message to ALL users connected to this room
      users.forEach(user => {
        if (user.rooms.some(r => String(r).trim() === roomId)) {
          user.ws.send(JSON.stringify({
            type: "user_text_message",
            message,
            senderName,
            userId,
            roomId,
            timestamp: new Date().toISOString()
          }));
        }
      });

      // 2. Persist text message to database (including senderName for history)
      const numericUserId = parseInt(userId);
      resolveNumericRoomId(roomId, numericUserId).then(finalRoomId => {
        if (finalRoomId && !isNaN(numericUserId)) {
          prismaClient.chat.create({
            data: {
              message: JSON.stringify({
                type: "chat_text",
                text: message,
                senderName: senderName
              }),
              roomId: finalRoomId,
              userId: numericUserId
            }
          }).catch(e => {
            console.error(`[WS] Failed to save text message to DB:`, e?.message ?? e);
          });
        }
      });
    }

    if (parsedData.type === "delete_shape") {
      const roomId = String(parsedData.roomId || "").trim();
      const shapeId = parsedData.shapeId;

      // 1. Broadcast deletion to all OTHER users in the room
      users.forEach(user => {
        if (user.rooms.some(r => String(r).trim() === roomId) && user.ws !== ws) {
          user.ws.send(JSON.stringify({
            type: "delete_shape",
            shapeId,
            roomId
          }));
        }
      });

      // 2. Delete the record from DB in the background
      resolveNumericRoomId(roomId).then(finalRoomId => {
        if (finalRoomId && shapeId) {
          prismaClient.chat.deleteMany({
            where: {
              roomId: finalRoomId,
              message: {
                contains: `"id":"${shapeId}"`
              }
            }
          })
            .then((res) => {
              console.log(`[WS] ✅ Shape deleted from DB — count=${res.count}, shapeId=${shapeId}`);
            })
            .catch((e) => {
              console.error(`[WS] ❌ DB delete FAILED for shapeId=${shapeId}:`, e?.message ?? e);
            });
        }
      });
    }

    if (parsedData.type === "clear_canvas") {
      const roomId = String(parsedData.roomId || "").trim();

      // 1. Broadcast clear canvas to all OTHER users in the room
      users.forEach(user => {
        if (user.rooms.some(r => String(r).trim() === roomId) && user.ws !== ws) {
          user.ws.send(JSON.stringify({
            type: "clear_canvas",
            roomId
          }));
        }
      });

      // 2. Delete all records for this room from DB in the background
      resolveNumericRoomId(roomId).then(finalRoomId => {
        if (finalRoomId) {
          prismaClient.chat.deleteMany({
            where: {
              roomId: finalRoomId
            }
          })
            .then((res) => {
              console.log(`[WS] ✅ Room shapes cleared in DB — count=${res.count}, roomId=${finalRoomId}`);
            })
            .catch((e) => {
              console.error(`[WS] ❌ DB clear FAILED for roomId=${finalRoomId}:`, e?.message ?? e);
            });
        }
      });
    }
  });

  // Clean up disconnected users to prevent memory leaks
  ws.on("close", () => {
    const index = users.findIndex(x => x.ws === ws);
    if (index !== -1) {
      console.log(`[WS] User ${userId} disconnected. Removing from active users list.`);
      users.splice(index, 1);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[WS] Server is listening on port ${PORT}`);
});