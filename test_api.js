const axios = require('axios');
(async () => {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', { email: 'admin@test.com', password: '123456' });
    const token = loginRes.data.token;
    console.log("Logged in, token:", token.substring(0, 10) + "...");
    
    const API = axios.create({ baseURL: "http://localhost:3000/api" });
    API.interceptors.request.use(req => {
      if (token) req.headers.Authorization = token;
      return req;
    });
    
    const callRes = await API.post('/tickets/call');
    console.log("Call result:", callRes.data);
  } catch (err) {
    console.error("Error status:", err.response?.status);
    console.error("Error data:", err.response?.data);
  }
})();
