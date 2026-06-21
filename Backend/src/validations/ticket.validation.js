const { body } = require("express-validator");

exports.createTicketValidation = [
  body("serviceId").isInt().withMessage("Service required")
];