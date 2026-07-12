const TransactionForm = {
  async show(onSave, transaction = null) {
    const categories = await API.categories.list();
    const isEdit = !!transaction;
    let selectedType = transaction?.tipo || 'expense';
    let selectedCategoryId = transaction?.categoryId || (categories.length > 0 ? categories[0].id : null);

    const form = create('div');

    const typeSelector = create('div', { className: 'type-selector' });
    ['expense', 'income', 'refund'].forEach(type => {
      const labels = { expense: 'Gasto', income: 'Ingreso', refund: 'Reembolso' };
      const btn = create('button', {
        className: `type-btn ${type === selectedType ? 'active' : ''}`,
        textContent: labels[type],
        dataset: { type }
      });
      on(btn, 'click', () => {
        selectedType = type;
        $$('.type-btn', form).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateCategoryVisibility();
        updateRecurringVisibility();
      });
      typeSelector.appendChild(btn);
    });
    form.appendChild(typeSelector);

    const categoryGroup = create('div', { className: 'form-group' });
    const categoryLabel = create('label', { textContent: 'Categoría' });
    const categorySelect = create('select', { className: 'form-control' });

    const parents = categories.filter(c => !c.parentId);
    const childrenMap = {};
    categories.forEach(c => {
      if (c.parentId) {
        if (!childrenMap[c.parentId]) childrenMap[c.parentId] = [];
        childrenMap[c.parentId].push(c);
      }
    });

    parents.forEach(cat => {
      categorySelect.appendChild(create('option', { value: cat.id, textContent: cat.nombre }));
      (childrenMap[cat.id] || []).forEach(child => {
        categorySelect.appendChild(create('option', { value: child.id, textContent: `  └ ${child.nombre}` }));
      });
    });

    if (selectedCategoryId) categorySelect.value = selectedCategoryId;
    categoryGroup.appendChild(categoryLabel);
    categoryGroup.appendChild(categorySelect);
    form.appendChild(categoryGroup);

    function updateCategoryVisibility() {
      categoryGroup.style.display = (selectedType === 'income') ? 'none' : 'block';
    }
    updateCategoryVisibility();

    const titleGroup = create('div', { className: 'form-group' });
    titleGroup.appendChild(create('label', { textContent: 'Título' }));
    const titleInput = create('input', {
      className: 'form-control',
      type: 'text',
      placeholder: 'Ej: Supermercado, Salary...',
      value: transaction?.titulo || ''
    });
    titleGroup.appendChild(titleInput);
    form.appendChild(titleGroup);

    const amountGroup = create('div', { className: 'form-group' });
    amountGroup.appendChild(create('label', { textContent: 'Monto (€)' }));
    const amountInput = create('input', {
      className: 'form-control',
      type: 'number',
      step: '0.01',
      min: '0.01',
      placeholder: '0.00',
      value: transaction?.monto || ''
    });
    amountGroup.appendChild(amountInput);
    form.appendChild(amountGroup);

    const dateGroup = create('div', { className: 'form-group' });
    dateGroup.appendChild(create('label', { textContent: 'Fecha' }));
    const dateInput = create('input', {
      className: 'form-control',
      type: 'date',
      value: transaction?.fecha || getToday()
    });
    dateGroup.appendChild(dateInput);
    form.appendChild(dateGroup);

    const clasifGroup = create('div', { className: 'form-group' });
    clasifGroup.appendChild(create('label', { textContent: 'Clasificación' }));
    const clasifSelect = create('select', { className: 'form-control' });
    clasifSelect.appendChild(create('option', { value: 'variable', textContent: 'Variable' }));
    clasifSelect.appendChild(create('option', { value: 'fijo', textContent: 'Fijo' }));
    clasifSelect.value = transaction?.clasificacion || 'variable';
    clasifGroup.appendChild(clasifSelect);
    form.appendChild(clasifGroup);

    const recurringGroup = create('div', { className: 'form-group recurring-section' });
    const recurringLabel = create('label', { className: 'checkbox-label' });
    const recurringCheckbox = create('input', { type: 'checkbox', className: 'form-checkbox' });
    recurringLabel.appendChild(recurringCheckbox);
    recurringLabel.appendChild(document.createTextNode(' Recurrente'));
    recurringGroup.appendChild(recurringLabel);

    const freqGroup = create('div', { className: 'recurring-options', style: { display: 'none', marginTop: '12px' } });

    const freqSelectGroup = create('div', { className: 'form-group' });
    freqSelectGroup.appendChild(create('label', { textContent: 'Frecuencia' }));
    const freqSelect = create('select', { className: 'form-control' });
    freqSelect.appendChild(create('option', { value: 'monthly', textContent: 'Mensual' }));
    freqSelect.appendChild(create('option', { value: 'bimonthly', textContent: 'Bimensual' }));
    freqSelect.appendChild(create('option', { value: 'semiannual', textContent: 'Semestral' }));
    freqSelect.appendChild(create('option', { value: 'annual', textContent: 'Anual' }));
    freqSelectGroup.appendChild(freqSelect);
    freqGroup.appendChild(freqSelectGroup);

    const endDateGroup = create('div', { className: 'form-group' });
    endDateGroup.appendChild(create('label', { textContent: 'Fecha fin' }));
    const endDateInput = create('input', {
      className: 'form-control',
      type: 'date'
    });
    endDateGroup.appendChild(endDateInput);

    const indeterminadoLabel = create('label', { className: 'checkbox-label', style: { marginTop: '8px' } });
    const indeterminadoCheckbox = create('input', { type: 'checkbox', className: 'form-checkbox' });
    indeterminadoLabel.appendChild(indeterminadoCheckbox);
    indeterminadoLabel.appendChild(document.createTextNode(' Indeterminado'));
    endDateGroup.appendChild(indeterminadoLabel);

    on(indeterminadoCheckbox, 'change', () => {
      endDateInput.disabled = indeterminadoCheckbox.checked;
      endDateInput.value = '';
      endDateInput.style.opacity = indeterminadoCheckbox.checked ? '0.4' : '1';
    });

    freqGroup.appendChild(endDateGroup);

    recurringGroup.appendChild(freqGroup);
    form.appendChild(recurringGroup);

    let recurringEnabled = transaction?.recurrente || false;
    if (recurringEnabled) {
      recurringCheckbox.checked = true;
      freqGroup.style.display = 'block';
      if (transaction?.frecuencia) freqSelect.value = transaction.frecuencia;
      if (transaction?.fechaFin) {
        endDateInput.value = transaction.fechaFin;
      } else {
        indeterminadoCheckbox.checked = true;
        endDateInput.disabled = true;
        endDateInput.style.opacity = '0.4';
      }
    }
    on(recurringCheckbox, 'change', () => {
      recurringEnabled = recurringCheckbox.checked;
      freqGroup.style.display = recurringEnabled ? 'block' : 'none';
    });

    function updateRecurringVisibility() {
      recurringGroup.style.display = (selectedType === 'income') ? 'none' : 'block';
    }
    updateRecurringVisibility();

    const footer = create('div', { style: { display: 'flex', gap: '8px' } });
    const cancelBtn = create('button', {
      className: 'btn btn-ghost',
      textContent: 'Cancelar',
      onClick: () => Modal.hide()
    });
    const saveBtn = create('button', {
      className: 'btn btn-primary',
      textContent: 'Guardar'
    });
    on(saveBtn, 'click', async () => {
      const data = {
        tipo: selectedType,
        titulo: titleInput.value.trim(),
        monto: parseFloat(amountInput.value),
        fecha: dateInput.value,
        clasificacion: clasifSelect.value
      };

      if (selectedType !== 'income') {
        data.categoryId = categorySelect.value;
      }

      if (recurringEnabled) {
        data.recurrente = true;
        data.frecuencia = freqSelect.value;
        if (!indeterminadoCheckbox.checked && endDateInput.value) {
          data.fechaFin = endDateInput.value;
        }
      }

      if (!data.titulo) return showToast('El título es obligatorio', 'error');
      if (!data.monto || data.monto <= 0) return showToast('El monto debe ser positivo', 'error');

      try {
        if (isEdit) {
          await API.transactions.update(transaction.originalId || transaction.id, data);
        } else {
          await API.transactions.create(data);
        }
        Modal.hide();
        showToast(isEdit ? 'Transacción actualizada' : 'Transacción guardada');
        if (onSave) onSave();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    Modal.show(isEdit ? 'Editar transacción' : 'Nueva transacción', form, { footer });
    titleInput.focus();
  }
};
