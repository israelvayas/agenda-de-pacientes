document.addEventListener('DOMContentLoaded', function() {
    const scheduleContainer = document.getElementById('schedule');
    const modal = document.getElementById('modal');
    const closeModal = document.querySelector('.close');
    const appointmentForm = document.getElementById('appointmentForm');
    const prevWeekBtn = document.getElementById('prevWeek');
    const nextWeekBtn = document.getElementById('nextWeek');
    const weekStartDateElem = document.getElementById('weekStartDate');
    const weekEndDateElem = document.getElementById('weekEndDate');
    const currentWeekElem = document.getElementById('currentWeek');
    const modalTitle = document.querySelector('#modal h2');
    const audioReminder = document.getElementById('audioReminder'); // Elemento de audio agregado

    let currentMonday = getCurrentMonday();
    let editingCita = null;
    mostrarHorarioSemana(currentMonday);

    // Mostrar la ventana emergente al inicio y cada 10 minutos
    mostrarVentanaEmergente();
    setInterval(mostrarVentanaEmergente, 600000); // 600000 ms = 10 minutos

    scheduleContainer.addEventListener('click', function(event) {
        const target = event.target;
        if (target.classList.contains('booked')) {
            const hour = target.dataset.hour;
            const date = target.dataset.date;

            const citas = JSON.parse(localStorage.getItem('citas')) || [];
            const citasEnHora = citas.filter(c => {
                const citaDate = new Date(c.fecha);
                return citaDate.toISOString().split('T')[0] === date && citaDate.getHours() === parseInt(hour);
            });

            if (citasEnHora.length > 0) {
                if (citasEnHora.length === 1) {
                    const confirmAction = confirm('¿Deseas eliminar el paciente existente o agregar otro paciente en este horario?');

                    if (confirmAction) {
                        const action = prompt('Escribe "eliminar" para eliminar el paciente o deja en blanco para agregar otro paciente.');

                        if (action && action.toLowerCase() === 'eliminar') {
                            const confirmDelete = confirm('¿Estás seguro que deseas eliminar esta cita?');
                            if (confirmDelete) {
                                const citasActualizadas = citas.filter(c => c.id !== citasEnHora[0].id);
                                localStorage.setItem('citas', JSON.stringify(citasActualizadas));
                                mostrarHorarioSemana(currentMonday);
                            }
                        } else {
                            modal.style.display = 'block';
                            modalTitle.textContent = 'Agendar Cita';

                            document.getElementById('appointmentDate').value = date;
                            document.getElementById('appointmentTime').value = hour;
                            document.getElementById('patientName').value = '';

                            editingCita = null;
                        }
                    }
                } else {
                    // Mostrar lista de pacientes y permitir elegir cuál eliminar o agregar
                    const patientList = citasEnHora.map(cita => {
                        return `${cita.nombre} (${cita.fecha.split('T')[1].slice(0, 5)})`;
                    }).join('\n');

                    const selectedOption = prompt(`Hay varios pacientes agendados en este horario:\n${patientList}\n\nEscribe el nombre del paciente que deseas eliminar o deja en blanco para agregar otro paciente:`);

                    if (selectedOption) {
                        const citaToDelete = citasEnHora.find(c => c.nombre.toUpperCase() === selectedOption.toUpperCase());
                        if (citaToDelete) {
                            const confirmDelete = confirm(`¿Estás seguro que deseas eliminar la cita de ${citaToDelete.nombre}?`);
                            if (confirmDelete) {
                                const citasActualizadas = citas.filter(c => c.id !== citaToDelete.id);
                                localStorage.setItem('citas', JSON.stringify(citasActualizadas));
                                mostrarHorarioSemana(currentMonday);
                            }
                        } else {
                            modal.style.display = 'block';
                            modalTitle.textContent = 'Agendar Cita';

                            document.getElementById('appointmentDate').value = date;
                            document.getElementById('appointmentTime').value = hour;
                            document.getElementById('patientName').value = selectedOption;

                            editingCita = null;
                        }
                    } else {
                        modal.style.display = 'block';
                        modalTitle.textContent = 'Agendar Cita';

                        document.getElementById('appointmentDate').value = date;
                        document.getElementById('appointmentTime').value = hour;
                        document.getElementById('patientName').value = '';

                        editingCita = null;
                    }
                }
            }
        } else if (target.classList.contains('available')) {
            const hour = target.dataset.hour;
            const date = target.dataset.date;

            modal.style.display = 'block';
            modalTitle.textContent = 'Agendar Cita';

            document.getElementById('appointmentDate').value = date;
            document.getElementById('appointmentTime').value = hour;
            document.getElementById('patientName').value = '';

            editingCita = null;
        }
    });

    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    appointmentForm.addEventListener('submit', function(event) {
        event.preventDefault();

        let patientName = document.getElementById('patientName').value;
        const appointmentDate = document.getElementById('appointmentDate').value;
        const appointmentTime = document.getElementById('appointmentTime').value;

        // Convertir el nombre del paciente a mayúsculas
        patientName = patientName.toUpperCase();

        if (!patientName || !appointmentDate || !appointmentTime) {
            alert('Por favor completa todos los campos.');
            return;
        }

        const cita = {
            id: editingCita || Date.now().toString(),
            nombre: patientName,
            fecha: `${appointmentDate}T${appointmentTime}`
        };

        let citas = JSON.parse(localStorage.getItem('citas')) || [];

        if (editingCita) {
            citas = citas.map(c => c.id === editingCita ? cita : c);
        } else {
            citas.push(cita);
        }

        localStorage.setItem('citas', JSON.stringify(citas));

        modal.style.display = 'none';
        appointmentForm.reset();
        mostrarHorarioSemana(currentMonday);
    });

    prevWeekBtn.addEventListener('click', function() {
        navigateWeek(-7);
    });

    nextWeekBtn.addEventListener('click', function() {
        navigateWeek(7);
    });

    function navigateWeek(daysToMove) {
        currentMonday.setDate(currentMonday.getDate() + daysToMove);
        mostrarHorarioSemana(currentMonday);
    }

    function mostrarHorarioSemana(startingMonday) {
        const citas = JSON.parse(localStorage.getItem('citas')) || [];

        scheduleContainer.innerHTML = '';

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dates = obtenerFechasSemana(startingMonday);

        const firstDay = dates[0];
        const lastDay = dates[dates.length - 1];
        weekStartDateElem.textContent = `${days[firstDay.getDay()]} ${firstDay.getDate()}`;
        weekEndDateElem.textContent = `${days[lastDay.getDay()]} ${lastDay.getDate()}`;
        currentWeekElem.textContent = `${firstDay.toLocaleDateString()} - ${lastDay.toLocaleDateString()}`;

        // Encabezado de la tabla
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Hora</th>';

        dates.forEach(date => {
            const th = document.createElement('th');
            th.textContent = `${days[date.getDay()]} ${date.getDate()}`;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Cuerpo de la tabla
        const startHour = 7;
        const endHour = 20;

        for (let hour = startHour; hour <= endHour; hour++) {
            const hourRow = document.createElement('tr');
            const hourCell = document.createElement('td');
            hourCell.textContent = `${hour}:00`;
            hourRow.appendChild(hourCell);

            dates.forEach(date => {
                const cell = document.createElement('td');
                cell.dataset.date = date.toISOString().split('T')[0];
                cell.dataset.hour = hour.toString();

                const citaEnHora = citas.find(c => {
                    const citaDate = new Date(c.fecha);
                    return citaDate.toISOString().split('T')[0] === cell.dataset.date && citaDate.getHours() === parseInt(cell.dataset.hour);
                });

                if (citaEnHora) {
                    cell.textContent = citaEnHora.nombre;
                    cell.classList.add('booked');
                } else {
                    cell.textContent = 'Disponible';
                    cell.classList.add('available');
                }

                hourRow.appendChild(cell);
            });

            tbody.appendChild(hourRow);
        }

        table.appendChild(tbody);
        scheduleContainer.appendChild(table);

        // Verificar y reproducir el sonido si la cita está próxima
        verificarCitasProximas(dates, citas);
    }

    function verificarCitasProximas(dates, citas) {
        const now = new Date();
        const thresholdMinutes = 10; // Umbral en minutos antes de la cita para activar el recordatorio

        dates.forEach(date => {
            const citaEnFecha = citas.find(c => {
                const citaDate = new Date(c.fecha);
                return citaDate.toISOString().split('T')[0] === date.toISOString().split('T')[0];
            });

            if (citaEnFecha) {
                const citaDate = new Date(citaEnFecha.fecha);
                const diffMinutes = Math.floor((citaDate.getTime() - now.getTime()) / 60000); // Diferencia en minutos

                if (diffMinutes > 0 && diffMinutes <= thresholdMinutes) {
                    // Mostrar recordatorio y reproducir sonido
                    const alertMessage = `Recordatorio: Cita con ${citaEnFecha.nombre} a las ${citaDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
                    alert(alertMessage);
                    audioReminder.play(); // Reproducir sonido de recordatorio
                }
            }
        });
    }

    function obtenerFechasSemana(startingMonday) {
        const dates = [];
        const currentDate = new Date(startingMonday);

        for (let i = 0; i < 7; i++) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }

    function getCurrentMonday() {
        const today = new Date();
        const day = today.getDay(),
            diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(today.setDate(diff));
    }

    function mostrarVentanaEmergente() {
        const now = new Date();
        const citas = JSON.parse(localStorage.getItem('citas')) || [];

        const citasHoy = citas.filter(cita => {
            const citaDate = new Date(cita.fecha);
            return citaDate.toISOString().split('T')[0] === now.toISOString().split('T')[0];
        });

        if (citasHoy.length > 0) {
            let alertMessage = `${now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, pacientes por atender:\n`;

            citasHoy.forEach(cita => {
                const citaDate = new Date(cita.fecha);
                if (citaDate > now) {
                    alertMessage += `${citaDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} ${cita.nombre}\n`;
                }
            });

            if (alertMessage !== `${now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, pacientes por atender:\n`) {
                alert(alertMessage);
            }
        }
    }
});
