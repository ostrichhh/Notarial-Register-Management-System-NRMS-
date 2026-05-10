import axios from 'axios';

import { API_BASE_URL } from '../config';

/** No auth interceptors — used for login / refresh primitives when needed outside shared instance. */
const nakedAuth = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
    accept: 'application/json',
  },
});

export default nakedAuth;
