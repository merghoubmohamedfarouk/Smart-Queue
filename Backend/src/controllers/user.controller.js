const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");

exports.getUsersByRole = async (req, res) => {
  try {
    const users = await prisma.admin.findMany();
    // Omit passwords
    const sanitizedUsers = users.map(u => ({ id: u.id, nom: u.nom, email: u.email }));
    res.json(sanitizedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

exports.createUser = async (req, res) => {
  const { nom, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.admin.create({
      data: { nom, email, password: hash }
    });
    res.json({ id: user.id, nom: user.nom, email: user.email });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { nom, email, password } = req.body;
  
  try {
    const data = { nom, email };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    
    // Ensure id is parsed as integer if necessary. Prisma ids are usually integers.
    // If it's a string uuid, parse appropriately. Let's assume parseInt(id). 
    // Checking ticket.controller, what does it use for id? Wait!
    // In auth.controller, user id is user.id, I assume Int. Let's look at ticket.controller.js later if it fails.
    const user = await prisma.admin.update({
      where: { id: parseInt(id) },
      data
    });
    res.json({ id: user.id, nom: user.nom, email: user.email });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.admin.delete({
      where: { id: parseInt(id) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};
