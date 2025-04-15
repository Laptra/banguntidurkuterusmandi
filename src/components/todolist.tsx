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

type SortKey = "text" | "deadline" | "remaining";
type SortOrder = "asc" | "desc";

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("text");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
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

  const calculateTimeRemaining = useCallback((deadline: string): string => {
    const deadlineTime = new Date(deadline).getTime();
    const now = Date.now();
    const difference = deadlineTime - now;

    if (difference <= 0) return "Waktu habis!";

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  }, []);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let compareVal = 0;
      if (sortKey === "text") {
        compareVal = a.text.localeCompare(b.text);
      } else if (sortKey === "deadline") {
        compareVal =
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      } else if (sortKey === "remaining") {
        compareVal =
          new Date(a.deadline).getTime() -
          Date.now() -
          (new Date(b.deadline).getTime() - Date.now());
      }
      return sortOrder === "asc" ? compareVal : -compareVal;
    });
  }, [tasks, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    setSortKey(key);
    setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
  };

  const addTask = async (): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: "Tambahkan tugas baru",
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nama tugas">' +
        '<input id="swal-input2" type="datetime-local" class="swal2-input">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
      preConfirm: () => {
        return [
          (document.getElementById("swal-input1") as HTMLInputElement)?.value,
          (document.getElementById("swal-input2") as HTMLInputElement)?.value,
        ];
      },
    });

    if (formValues && formValues[0] && formValues[1]) {
      const newTask: Omit<Task, "id"> = {
        text: formValues[0],
        completed: false,
        deadline: formValues[1],
      };
      try {
        const docRef = await addDoc(collection(db, "tasks"), newTask);
        setTasks((prevTasks) => [...prevTasks, { id: docRef.id, ...newTask }]);
        Swal.fire("Berhasil!", "Tugas ditambahkan.", "success");
      } catch (error) {
        console.error("Error adding task:", error);
      }
    }
  };

  const editTask = async (task: Task) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit tugas",
      html:
        `<input id="swal-input1" class="swal2-input" value="${task.text}" placeholder="Nama tugas">` +
        `<input id="swal-input2" type="datetime-local" class="swal2-input" value="${task.deadline}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Update",
      cancelButtonText: "Batal",
      preConfirm: () => {
        return [
          (document.getElementById("swal-input1") as HTMLInputElement)?.value,
          (document.getElementById("swal-input2") as HTMLInputElement)?.value,
        ];
      },
    });

    if (formValues && formValues[0] && formValues[1]) {
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
        Swal.fire("Berhasil!", "Tugas berhasil diedit.", "success");
      } catch (error) {
        console.error("Error updating task:", error);
      }
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    const confirm = await Swal.fire({
      title: "Yakin ingin menghapus?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });
    if (confirm.isConfirmed) {
      try {
        await deleteDoc(doc(db, "tasks", id));
        setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
        Swal.fire("Berhasil!", "Tugas berhasil dihapus.", "success");
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

  const getSortArrow = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortOrder === "asc" ? "▲" : "▼";
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

        <div className="flex justify-center mb-8">
        <button
  onClick={addTask}
  className="relative inline-block px-6 py-3 bg-yellow-400 text-black font-bold text-sm shadow-[4px_4px_0_#000] border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
>
  <span className="block uppercase tracking-wide">+ Tambah Kegiatan</span>
</button>

        </div>

        <div className="grid grid-cols-5 gap-4 font-semibold text-center text-gray-200 mb-4 px-2">
          <div
            className="text-left cursor-pointer"
            onClick={() => toggleSort("text")}
          >
            Kegiatan {getSortArrow("text")}
          </div>
          <div onClick={() => toggleSort("deadline")}>
            Deadline {getSortArrow("deadline")}
          </div>
          <div onClick={() => toggleSort("remaining")}>
            Sisa Waktu {getSortArrow("remaining")}
          </div>
          <div className="col-span-2 text-right">Aksi</div>
        </div>

        <ul className="space-y-4">
          <AnimatePresence>
            {sortedTasks.map((task) => {
              const timeLeft = calculateTimeRemaining(task.deadline);
              const isExpired = timeLeft === "Waktu habis!";
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
