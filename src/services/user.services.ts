import { responseError, responseSuccess } from "response-manager";
import User from "../models/user.model";
import { createToken, verifyToken } from "../helpers/token";
import sendEmail from "../helpers/email";
// get all users
export const getUsersService = async (res, params) => {
  const search = params.search || "";
  const limit = params.limit || 5;
  const page = params.page || 1;

  //   search reges
  const searchRegexExp = new RegExp(".*" + search + ".*", "i");
  //  filtering
  const filter = {
    isAdmin: {
      $ne: true,
      $or: [
        { name: { $regex: searchRegexExp } },
        { email: { $regex: searchRegexExp } },
        { phone: { $regex: searchRegexExp } },
      ],
    },
  };
  //   removing password from data
  const options = { password: 0 };
  // finding user
  const user = await User.find(filter, options)
    .limit(limit)
    .skip((page - 1) * limit);
  // counting all the documents
  const count = await User.find().countDocuments();
  //   if user does not exist
  if (!user) return responseError(res, 403, "failed", " User not exist!");
  const data = {
    totalPage: Math.ceil(count / limit),
    currentPage: page,
    previousPage: page - 1 > 0 ? page - 1 : null,
    nextPage: page + 1 < Math.ceil(count / limit) ? page + 1 : null,
    user,
  };

  return responseSuccess(res, 201, "success", data);
};
// *get single user by id
export const getUserByIdService = async (res, id) => {
  const options = { password: 0 };
  const user = await User.findById(id, options);
  if (!user) return responseError(res, 401, "failed", "user not exist");
  return responseSuccess(res, 200, "success", user);
};
// remove user by id
export const removeUserByIdService = async (res, id) => {
  const user = await User.findOneAndDelete({ _id: id });
  if (!user) return responseError(res, 401, "failed", "Error deleting user");
  return responseSuccess(res, 201, "success", "User deleted !");
};

// register user service

export const registerUserService = async (res, req) => {
  const { name, email, password, phone, address } = req.body;
  const imageBufferString = req.file.buffer.toString("base64");

  if (!req.file) {
    return responseError(res, 200, "failed", "image can not be empty");
  }
  // checking if user exist in this email
  const isExist = await User.findOne({ email });
  if (isExist) {
    return responseError(res, 409, "conflict", "Email has been used!");
  }
  // create token
  const token = await createToken({
    name,
    email,
    password,
    phone,
    address,
    image: imageBufferString,
  });
  //email data
  const emailData = {
    email,
    subject: "Account Activation Email",
    html: `
    <h2>Hello ${name}</h2>
    <p>please click here  <a href="${token}"> Click Here </a> </p>
    `,
  };
  // send email
  // await sendEmail(emailData);

  responseSuccess(res, 201, "success ", "Check your email for verification");
};
// activate user controller
export const activateUserAccountService = async (res, token) => {
  if (!token) {
    return responseSuccess(res, 201, "failed", "Invalid Token");
  }
  const decoded = await verifyToken(token);
  await User.create(decoded);
  return responseSuccess(res, 201, "success", "new user created successful");
};
