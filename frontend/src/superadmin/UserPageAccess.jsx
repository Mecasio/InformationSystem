import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  Snackbar,
  Alert,
  TextField,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

const ROLE_LABEL = {
  admission: "Admission Officer",
  enrollment: "Enrollment Officer",
  clinic: "Clinic Staff",
  registrar: "Registrar",
  superadmin: "Administrator",
};

const UserPageAccess = () => {
  const settings = useContext(SettingsContext);

  // UI Colors
  const [titleColor, setTitleColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#000000");

  // Access control
  const pageId = 91;
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // User list
  const [allUsers, setAllUsers] = useState([]);

  // Selected user access data
  const [selectedUser, setSelectedUser] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageAccess, setPageAccess] = useState({});
  const [userRole, setUserRole] = useState("");
  const [openModal, setOpenModal] = useState(false);


  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // Load settings
  useEffect(() => {
    if (!settings) return;
    if (settings.title_color) setTitleColor(settings.title_color);
    if (settings.border_color) setBorderColor(settings.border_color);
  }, [settings]);

  // Check page privilege
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedRole !== "registrar") {
      window.location.href = "/login";
      return;
    }

    checkAccess(storedEmployeeID);
    loadAllUsers();
  }, []);

  const checkAccess = async (empID) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/page_access/${empID}/${pageId}`);
      setHasAccess(res.data && res.data.page_privilege === 1);
    } catch {
      setHasAccess(false);
    }
  };

  // Load all users
  const loadAllUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/registrars`);
      setAllUsers(res.data);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  // Load selected user's access
  const loadUserAccess = async (employeeId) => {
    setLoading(true);
    setSelectedUser(null);
    setPageAccess({});
    setPages([]);
    setUserRole("");

    try {
      const pagesResp = await axios.get(`${API_BASE_URL}/api/pages`);
      const accessResp = await axios.get(`${API_BASE_URL}/api/page_access/${employeeId}`);

      const allPages = pagesResp.data || [];
      const accessRows = accessResp.data || [];

      const accessList = accessRows.map((r) => Number(r.page_id));

      const accessMap = {};
      allPages.forEach((p) => {
        accessMap[p.id] = accessList.includes(p.id);
      });

      setPages(allPages);
      setSelectedUser({ employee_id: employeeId });
      setPageAccess(accessMap);
      setUserRole("Loaded");

      setOpenModal(true); // <<-------------- OPEN MODAL HERE

      setSnackbar({ open: true, type: "success", message: "User access loaded" });
    } catch (err) {
      setSnackbar({ open: true, type: "error", message: "Failed to load access" });
    } finally {
      setLoading(false);
    }
  };

  // Update access privilege
  const handleToggleChange = async (pageId, hasAccessNow) => {
    if (!selectedUser) return;

    const newState = !hasAccessNow;

    // Optimistic update
    setPageAccess((prev) => ({ ...prev, [pageId]: newState }));

    try {
      if (newState) {
        await axios.post(`${API_BASE_URL}/api/page_access/${selectedUser.employee_id}/${pageId}`);
      } else {
        await axios.delete(`${API_BASE_URL}/api/page_access/${selectedUser.employee_id}/${pageId}`);
      }

      setSnackbar({
        open: true,
        type: "success",
        message: newState ? "Access granted" : "Access revoked",
      });
    } catch {
      // rollback
      setPageAccess((prev) => ({ ...prev, [pageId]: hasAccessNow }));
      setSnackbar({ open: true, type: "error", message: "Failed to update access" });
    }
  };

  if (hasAccess === false) return <Unauthorized />;

  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", pr: 1 }}>
      {/* TITLE */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          mb: 2,
          color: titleColor,
        }}
      >
        USER PAGE ACCESS
      </Typography>

      {/* USER LIST TABLE */}
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: "#7E0000" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Employee ID</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Name</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Email</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Role</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {allUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.employee_id}</TableCell>
                  <TableCell>{`${u.last_name}, ${u.first_name}`}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>

                  <TableCell>
                    <Button
                      variant="contained"
                      onClick={() => loadUserAccess(u.employee_id)}
                    >
                      Edit Access
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Editing Access For: {selectedUser?.employee_id}
        </DialogTitle>

        <DialogContent dividers sx={{ maxHeight: "70vh" }}>
          <Paper sx={{ border: `2px solid ${borderColor}` }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: "#555" }}>
                  <TableRow>
                    <TableCell sx={{ color: "white" }}>#</TableCell>
                    <TableCell sx={{ color: "white" }}>Page Description</TableCell>
                    <TableCell sx={{ color: "white" }}>Page Group</TableCell>
                    <TableCell sx={{ color: "white" }} align="center">Access</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {pages.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{p.page_description}</TableCell>
                      <TableCell>{p.page_group}</TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={pageAccess[p.id] || false}
                          onChange={() =>
                            handleToggleChange(p.id, pageAccess[p.id] || false)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

              </Table>
            </TableContainer>
          </Paper>
        </DialogContent>

        <DialogActions>
          <Button variant="contained" color="error" onClick={() => setOpenModal(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.type} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserPageAccess;
