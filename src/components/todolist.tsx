"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../app/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  deadline: string;
};

type SortOption = "abjad-asc" | "time-asc";

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("time-asc");
  const [, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "tasks"));
        const tasksData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        setTasks(tasksData);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };
    fetchTasks();
  }, []);

  const calculateTimeRemaining = useCallback((deadline: string): number => {
    const deadlineTime = new Date(deadline).getTime();
    const now = Date.now();
    return deadlineTime - now;
  }, []);

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return "Waktu habis!";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks];
    switch (sortOption) {
      case "abjad-asc":
        sorted.sort((a, b) => a.text.localeCompare(b.text));
        break;
      case "time-asc":
        sorted.sort(
          (a, b) => calculateTimeRemaining(a.deadline) - calculateTimeRemaining(b.deadline)
        );
        break;
    }
    return sorted;
  }, [tasks, sortOption, calculateTimeRemaining]);

  const addTask = async (): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: "Tambah Kegiatan",
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nama kegiatan">' +
        '<input id="swal-input2" type="datetime-local" class="swal2-input">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const text = (
          document.getElementById("swal-input1") as HTMLInputElement
        )?.value.trim();
        const deadline = (
          document.getElementById("swal-input2") as HTMLInputElement
        )?.value;
        if (!text || !deadline) {
          Swal.showValidationMessage("Semua kolom harus diisi!");
          return;
        }
        return [text, deadline];
      },
    });

    if (formValues) {
      const newTask: Omit<Task, "id"> = {
        text: formValues[0],
        completed: false,
        deadline: formValues[1],
      };
      try {
        const docRef = await addDoc(collection(db, "tasks"), newTask);
        setTasks((prevTasks) => [...prevTasks, { id: docRef.id, ...newTask }]);
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Kegiatan berhasil ditambahkan.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error adding task:", error);
      }
    }
  };

  const editTask = async (task: Task) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Kegiatan",
      html:
        `<input id="swal-input1" class="swal2-input" value="${task.text}" placeholder="Nama kegiatan">` +
        `<input id="swal-input2" type="datetime-local" class="swal2-input" value="${task.deadline}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const text = (
          document.getElementById("swal-input1") as HTMLInputElement
        )?.value.trim();
        const deadline = (
          document.getElementById("swal-input2") as HTMLInputElement
        )?.value;
        if (!text || !deadline) {
          Swal.showValidationMessage("Semua kolom harus diisi!");
          return;
        }
        return [text, deadline];
      },
    });

    if (formValues) {
      const taskRef = doc(db, "tasks", task.id);
      try {
        await updateDoc(taskRef, {
          text: formValues[0],
          deadline: formValues[1],
        });
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id
              ? { ...t, text: formValues[0], deadline: formValues[1] }
              : t
          )
        );
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Kegiatan berhasil diubah.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error updating task:", error);
      }
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    const confirm = await Swal.fire({
      title: "Yakin ingin menghapus?",
      text: "Tugas yang dihapus tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (confirm.isConfirmed) {
      try {
        await deleteDoc(doc(db, "tasks", id));
        setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Kegiatan berhasil dihapus.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  const toggleComplete = async (id: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);

    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, {
      completed: !tasks.find((task) => task.id === id)?.completed,
    });
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center py-10 px-4 text-white"
      style={{ backgroundImage: "url('/city-bg.png.webp')" }}
    >
      <div className="max-w-4xl mx-auto bg-black/70 border border-purple-700 rounded-3xl shadow-2xl p-8 backdrop-blur-sm">
        <h1 className="text-4xl font-extrabold text-center mb-8 tracking-wide text-purple-300 drop-shadow-md">
          TO DO LIST
        </h1>

        <div className="flex flex-col md:flex-row md:justify-between items-center gap-4 mb-6">
          <button
            onClick={addTask}
            className="px-6 py-3 bg-yellow-400 text-black font-bold shadow-[4px_4px_0_#000] border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100"
          >
            + Tambah Kegiatan
          </button>

          <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          <option value="abjad-asc">Sort by name</option>
          <option value="time-asc">Sort by time</option>
        </select>
        </div>

        <ul className="space-y-4">
          <AnimatePresence>
            {sortedTasks.map((task) => {
              const msRemaining = calculateTimeRemaining(task.deadline);
              const timeLeft = formatTimeRemaining(msRemaining);
              const isExpired = msRemaining <= 0;
              const rowColor = task.completed
                ? "bg-green-700 border-green-400"
                : isExpired
                ? "bg-red-800 border-red-500"
                : "bg-yellow-600 border-yellow-400";

              return (
                <motion.li
                  key={task.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`grid grid-cols-5 gap-4 items-center text-center px-4 py-3 rounded-xl border shadow-md ${rowColor} hover:scale-[1.01] hover:shadow-xl transition-all duration-200`}
                >
                  <div className="flex items-center space-x-2 text-left">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleComplete(task.id)}
                      className="form-checkbox h-5 w-5 text-green-400"
                    />
                    <span
                      className={`truncate max-w-[180px] ${
                        task.completed
                          ? "line-through text-gray-400"
                          : "text-white"
                      }`}
                      title={task.text}
                    >
                      {task.text}
                    </span>
                  </div>
                  <div className="text-sm">
                    {new Date(task.deadline).toLocaleDateString()}
                  </div>
                  <div className="text-sm">{timeLeft}</div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button
                      onClick={() => editTask(task)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg border border-blue-500 text-blue-500 hover:bg-blue-600 hover:text-white transition duration-200 text-sm font-semibold shadow-md"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg border border-red-500 text-red-500 hover:bg-red-600 hover:text-white transition duration-200 text-sm font-semibold shadow-md"
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
